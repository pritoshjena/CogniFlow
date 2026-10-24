"""FastAPI endpoints for CogniFlow's standalone AI recommendation module."""
from __future__ import annotations
import logging
import os
import time
from typing import Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from .assignment_engine import recommend_assignments
from .fallback_planner import create_fallback_plan
from .gemini_planner import generate_plan_with_gemini
from .scheduler import calculate_schedule, sanitize_dependencies
from .schemas import ExistingTasksRequest, PlanRequest

logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="CogniFlow AI Recommender API",
    description="AI-assisted task breakdown, skill-based assignments, milestones, and deadline estimation.",
    version="1.1.0",
)
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


def _dump(model: Any) -> dict[str, Any]:
    return model.model_dump(exclude_none=True) if hasattr(model, "model_dump") else dict(model)


def _safe_message(error: Exception) -> str:
    return str(error or "Unknown error")[:240].replace(os.getenv("GEMINI_API_KEY", "__NO_KEY__"), "[redacted-key]")


def _safe_env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        return max(minimum, min(int(os.getenv(name, str(default))), maximum))
    except ValueError:
        return default


def _free_tier_max_tasks() -> int:
    return _safe_env_int("GEMINI_MAX_TASKS", 8, 4, 12)


def _normalize_tasks(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for task in tasks:
        item = dict(task)
        item["id"] = str(item["id"])
        item["dependsOn"] = [str(dep) for dep in item.get("dependsOn", [])]
        if not item.get("deliverable"):
            item["deliverable"] = item.get("title", "Task deliverable")
        normalized.append(item)
    return normalized


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "cogniflow-ai-recommender-python",
        "version": "1.1.0",
        "buildVersion": "free-tier-v1",
        "thinkingLevel": os.getenv("GEMINI_THINKING_LEVEL", "low"),
        "maxTasksPerAIPlan": _free_tier_max_tasks(),
        "maxOutputTokens": _safe_env_int("GEMINI_MAX_OUTPUT_TOKENS", 3072, 2048, 4096),
        "cacheTtlSeconds": _safe_env_int("GEMINI_CACHE_TTL_SECONDS", 900, 0, 3600),
        "aiConfigured": bool(os.getenv("GEMINI_API_KEY")),
        "model": os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
    }


@app.post("/api/plan")
async def create_plan(body: PlanRequest) -> dict[str, Any]:
    request_started = time.perf_counter()
    project = _dump(body.project)
    members = [_dump(member) for member in body.teamMembers]
    options = _dump(body.options)
    warnings: list[str] = []
    requested_max_tasks = options["maxTasks"]
    effective_max_tasks = min(requested_max_tasks, _free_tier_max_tasks())

    if body.tasks:
        plan = {
            "summary": "Using caller-provided tasks; Gemini task generation was skipped.",
            "assumptions": [], "risks": [], "tasks": _normalize_tasks([_dump(task) for task in body.tasks]),
            "generatedBy": "provided", "cacheHit": False,
        }
    else:
        try:
            gemini_started = time.perf_counter()
            if effective_max_tasks < requested_max_tasks:
                warnings.append(
                    f"Free-tier safeguard limited AI-generated tasks to {effective_max_tasks} "
                    f"(requested {requested_max_tasks}) to keep responses and quota usage bounded."
                )
            plan = await run_in_threadpool(generate_plan_with_gemini, project, members, effective_max_tasks)
            logger.info("[CogniFlow] Planner returned %d tasks in %.2fs (generatedBy=%s, cacheHit=%s)", len(plan.get("tasks", [])), time.perf_counter() - gemini_started, plan.get("generatedBy"), plan.get("cacheHit", False))
        except Exception as error:
            logger.warning("[CogniFlow] Gemini generation failed after %.2fs: %s", time.perf_counter() - locals().get("gemini_started", time.perf_counter()), _safe_message(error))
            if os.getenv("GEMINI_REQUIRED", "false").lower() == "true":
                raise HTTPException(status_code=503, detail={
                    "error": "AI planner unavailable", "message": _safe_message(error), "fallbackAvailable": True,
                }) from error
            warnings.append(f"Gemini was unavailable; a rule-based draft was generated instead. ({_safe_message(error)})")
            plan = create_fallback_plan(project, members, effective_max_tasks)

    schedule_started = time.perf_counter()
    try:
        task_list = _normalize_tasks(plan["tasks"])
        task_list, dependency_warnings = sanitize_dependencies(task_list)
        warnings.extend(dependency_warnings)
        assigned = recommend_assignments(task_list, members, {**project, "includeUnassigned": options["includeUnassigned"]})
        schedule = calculate_schedule(assigned, members, project, {"contingencyPercent": options["contingencyPercent"]})
    except Exception as error:
        if plan.get("generatedBy") == "gemini" and os.getenv("GEMINI_REQUIRED", "false").lower() != "true":
            warnings.append(f"Generated plan was invalid and replaced with a rule-based draft. ({_safe_message(error)})")
            plan = create_fallback_plan(project, members, effective_max_tasks)
            fallback_tasks, fallback_dependency_warnings = sanitize_dependencies(_normalize_tasks(plan["tasks"]))
            warnings.extend(fallback_dependency_warnings)
            assigned = recommend_assignments(fallback_tasks, members, {**project, "includeUnassigned": options["includeUnassigned"]})
            assigned, assigned_dependency_warnings = sanitize_dependencies(assigned)
            warnings.extend(assigned_dependency_warnings)
            schedule = calculate_schedule(assigned, members, project, {"contingencyPercent": options["contingencyPercent"]})
        else:
            raise HTTPException(status_code=422, detail={"error": "Could not calculate a valid schedule", "message": _safe_message(error), "warnings": warnings}) from error

    logger.info("[CogniFlow] Scheduling took %.3fs; total /api/plan time %.2fs", time.perf_counter() - schedule_started, time.perf_counter() - request_started)
    return {
        "ok": True,
        "project": {"title": project["title"], "description": project["description"], "startDate": schedule["timeline"]["startDate"]},
        "plan": {"summary": plan.get("summary", "Generated plan"), "assumptions": plan.get("assumptions", []),
                 "risks": plan.get("risks", []), "generatedBy": plan.get("generatedBy", "gemini"),
                 "cacheHit": plan.get("cacheHit", False)},
        **schedule,
        "warnings": warnings,
        "reviewRequired": True,
    }


@app.post("/api/assignments/recommend")
def recommend_existing_assignments(body: ExistingTasksRequest) -> dict[str, Any]:
    project = _dump(body.project)
    members = [_dump(member) for member in body.teamMembers]
    tasks = _normalize_tasks([_dump(task) for task in body.tasks])
    options = _dump(body.options)
    try:
        assigned = recommend_assignments(tasks, members, {**project, "includeUnassigned": options["includeUnassigned"]})
        return {"ok": True, "recommendations": [
            {"taskId": task["id"], "taskTitle": task["title"], "assignment": task.get("assignment"), "alternatives": task.get("alternatives", [])}
            for task in assigned
        ]}
    except Exception as error:
        raise HTTPException(status_code=422, detail={"error": "Could not generate assignments", "message": _safe_message(error)}) from error


@app.post("/api/schedule/estimate")
def estimate_schedule(body: ExistingTasksRequest) -> dict[str, Any]:
    project = _dump(body.project)
    members = [_dump(member) for member in body.teamMembers]
    tasks = _normalize_tasks([_dump(task) for task in body.tasks])
    options = _dump(body.options)
    try:
        tasks, dependency_warnings = sanitize_dependencies(tasks)
        assigned = recommend_assignments(tasks, members, {**project, "includeUnassigned": options["includeUnassigned"]})
        return {"ok": True, **calculate_schedule(assigned, members, project, {"contingencyPercent": options["contingencyPercent"]}), "warnings": dependency_warnings}
    except Exception as error:
        raise HTTPException(status_code=422, detail={"error": "Could not calculate schedule", "message": _safe_message(error)}) from error


@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    # HTTPException is handled by FastAPI; this is for unexpected server-side errors only.
    return JSONResponse(status_code=500, content={"error": "Internal server error", "message": _safe_message(exc)})
