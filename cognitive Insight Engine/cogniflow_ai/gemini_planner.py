"""Free-tier-conscious Gemini task generation for CogniFlow.

Uses one compact request, low thinking, bounded task count, no application-level
retries, and a short in-memory cache for identical successful requests.
"""
from __future__ import annotations

import copy
import hashlib
import json
import logging
import os
import threading
import time
from typing import Any

logger = logging.getLogger("uvicorn.error")

SYSTEM_INSTRUCTIONS = """You are CogniFlow's project-planning engine. Return only valid JSON.
Create a practical draft plan for the supplied project and team. Generate no more
than maxTasks tasks. Use short descriptions (one sentence), person-hour estimates,
required skill names, priority, stable IDs T1..Tn, dependency IDs, milestone names,
and deliverables. Include discovery/planning, implementation, integration, testing,
and handover when relevant. Dependencies must form a directed acyclic graph and may
refer only to task IDs you generated. Do not invent member IDs. Do not assign people;
the backend scores people against tasks. Be concise. Do not claim estimates are certain.
Return this shape: {"summary":"...", "assumptions":[...], "risks":[...], "tasks":[{"id":"T1","title":"...","description":"...","requiredSkills":["..."],"estimateHours":6,"priority":"medium","dependsOn":[],"milestoneName":"...","deliverable":"..."}]}.
"""

# Process-local cache only. Restarting the service clears it. Cache only successful
# Gemini plans; errors are never cached. A lock serializes cache misses so two rapid
# identical Swagger/UI requests do not consume two Gemini API calls.
_PLAN_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_LOCK = threading.Lock()


def generate_plan_with_gemini(project: dict[str, Any], members: list[dict[str, Any]], max_tasks: int = 8) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip() or "gemini-3.8-flash"
    thinking_level = os.getenv("GEMINI_THINKING_LEVEL", "low").strip().lower()
    if thinking_level not in {"low", "medium", "high"}:
        thinking_level = "low"

    try:
        max_output_tokens = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "3072"))
    except ValueError:
        max_output_tokens = 3072
    max_output_tokens = max(2048, min(max_output_tokens, 4096))
    try:
        cache_ttl = int(os.getenv("GEMINI_CACHE_TTL_SECONDS", "900"))
    except ValueError:
        cache_ttl = 900
    cache_ttl = max(0, min(cache_ttl, 3600))

    input_data = {
        "project": {
            "title": project["title"],
            "description": project.get("description", ""),
            "startDate": project.get("startDate"),
            "targetDeadline": project.get("targetDeadline"),
            "workingDaysPerWeek": project.get("workingDaysPerWeek", 5),
            "hoursPerWorkday": project.get("hoursPerWorkday", 6),
        },
        "teamMembers": [{
            "id": str(m["id"]),
            "name": m["name"],
            "role": m.get("role", "member"),
            "skills": m.get("skills", []),
            "proficiency": m.get("proficiency", {}),
            "experienceYears": m.get("experienceYears"),
            "hoursPerDay": m.get("hoursPerDay"),
            "weeklyCapacityHours": m.get("weeklyCapacityHours"),
            "currentLoadHours": m.get("currentLoadHours", 0),
            "preferences": m.get("preferences", []),
        } for m in members],
        "maxTasks": max_tasks,
    }

    cache_key = hashlib.sha256(json.dumps({
        "model": model,
        "thinking": thinking_level,
        "maxOutputTokens": max_output_tokens,
        "apiKeyFingerprint": hashlib.sha256(api_key.encode()).hexdigest()[:12],
        "input": input_data,
    }, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()

    # Keep the lock across cache miss + generation to avoid wasting free-tier quota
    # on duplicate concurrent requests. This intentionally favors quota safety over
    # parallel Gemini calls in this hackathon-sized service.
    with _CACHE_LOCK:
        now = time.time()
        cached = _PLAN_CACHE.get(cache_key)
        if cached and cached[0] > now:
            result = copy.deepcopy(cached[1])
            result["cacheHit"] = True
            logger.info("[CogniFlow] Gemini plan cache hit; skipped API call")
            return result
        if cached:
            _PLAN_CACHE.pop(cache_key, None)

        result = _generate_uncached(
            api_key=api_key,
            model=model,
            thinking_level=thinking_level,
            max_output_tokens=max_output_tokens,
            input_data=input_data,
            max_tasks=max_tasks,
        )
        result["cacheHit"] = False
        if cache_ttl:
            # Keep memory bounded. Remove expired entries and evict the earliest expiry.
            for key in [k for k, (expires, _) in _PLAN_CACHE.items() if expires <= now]:
                _PLAN_CACHE.pop(key, None)
            if len(_PLAN_CACHE) >= 32:
                oldest = min(_PLAN_CACHE, key=lambda key: _PLAN_CACHE[key][0])
                _PLAN_CACHE.pop(oldest, None)
            _PLAN_CACHE[cache_key] = (time.time() + cache_ttl, copy.deepcopy(result))
        return result


def _generate_uncached(*, api_key: str, model: str, thinking_level: str,
                       max_output_tokens: int, input_data: dict[str, Any],
                       max_tasks: int) -> dict[str, Any]:
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError("Install google-genai to enable Gemini") from exc

    # One Gemini request only; do not automatically retry rate-limit errors on a
    # free tier. A clean fallback is better than burning quota and keeping the UI spinning.
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=45_000,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )
    prompt = f"{SYSTEM_INSTRUCTIONS}\nInput (JSON):\n{json.dumps(input_data, ensure_ascii=False, separators=(',', ':'))}"
    started = time.perf_counter()
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=max_output_tokens,
            thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
        ),
    )
    duration = time.perf_counter() - started
    response_text = (response.text or "").strip()

    usage = getattr(response, "usage_metadata", None)
    prompt_tokens = getattr(usage, "prompt_token_count", None) if usage else None
    output_tokens = getattr(usage, "candidates_token_count", None) if usage else None
    thoughts_tokens = getattr(usage, "thoughts_token_count", None) if usage else None
    logger.info(
        "[CogniFlow] Gemini completed in %.2fs (model=%s, thinking=%s, taskCap=%d, "
        "promptTokens=%s, outputTokens=%s, thinkingTokens=%s, responseChars=%d)",
        duration, model, thinking_level, max_tasks, prompt_tokens, output_tokens,
        thoughts_tokens, len(response_text),
    )
    if not response_text:
        raise RuntimeError("Gemini returned an empty response")
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Gemini response was not valid JSON; try fewer tasks or a higher GEMINI_MAX_OUTPUT_TOKENS") from exc

    raw_tasks = data.get("tasks")
    if not isinstance(raw_tasks, list) or not raw_tasks:
        raise RuntimeError("Gemini returned no tasks")
    tasks = []
    for index, raw in enumerate(raw_tasks[:max_tasks], start=1):
        if not isinstance(raw, dict):
            continue
        task_id = str(raw.get("id") or f"T{index}")[:80]
        required = raw.get("requiredSkills", [])
        deps = raw.get("dependsOn", [])
        tasks.append({
            "id": task_id,
            "title": str(raw.get("title") or f"Task {index}")[:180],
            "description": str(raw.get("description") or "")[:1000],
            "requiredSkills": [str(s)[:80] for s in required if isinstance(s, str)][:8] if isinstance(required, list) else [],
            "estimateHours": _clamp(raw.get("estimateHours"), 1, 240, 6),
            "priority": str(raw.get("priority", "medium")).lower() if str(raw.get("priority", "medium")).lower() in {"low", "medium", "high", "critical"} else "medium",
            "dependsOn": [str(dep) for dep in deps][:20] if isinstance(deps, list) else [],
            "milestoneName": str(raw.get("milestoneName") or "Delivery")[:120],
            "deliverable": str(raw.get("deliverable") or raw.get("title") or "Task deliverable")[:200],
        })
    if not tasks:
        raise RuntimeError("Gemini did not return any valid tasks")

    return {
        "summary": str(data.get("summary") or "Generated project plan; team-lead review is required.")[:900],
        "assumptions": [str(x)[:350] for x in data.get("assumptions", [])[:8]] if isinstance(data.get("assumptions"), list) else [],
        "risks": [str(x)[:350] for x in data.get("risks", [])[:8]] if isinstance(data.get("risks"), list) else [],
        "tasks": tasks,
        "generatedBy": "gemini",
    }


def _clamp(value: Any, minimum: float, maximum: float, fallback: float) -> float:
    try:
        number = float(value)
        if number != number or number in (float("inf"), float("-inf")):
            return fallback
        return max(minimum, min(maximum, number))
    except (TypeError, ValueError):
        return fallback
