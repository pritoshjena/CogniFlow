"""Skill, availability and workload-aware assignment recommendations."""
from __future__ import annotations
from typing import Any
from .skills import match_skill_score


def _availability_score(member: dict[str, Any], project: dict[str, Any]) -> int:
    daily = member.get("hoursPerDay")
    if daily is None:
        daily = project.get("hoursPerWorkday", 6)
    target = max(1.0, float(project.get("hoursPerWorkday", 6)))
    return max(0, min(100, round(float(daily) / target * 100)))


def _initial_load(member: dict[str, Any]) -> float:
    daily = float(member.get("hoursPerDay", 6))
    capacity = float(member.get("weeklyCapacityHours", max(1, daily * 5)))
    return min(1.5, float(member.get("currentLoadHours", 0)) / max(capacity, 1))


def _preference_score(task: dict[str, Any], member: dict[str, Any]) -> int:
    preferences = [str(p).lower() for p in member.get("preferences", [])]
    text = f"{task.get('title', '')} {task.get('description', '')} {' '.join(task.get('requiredSkills', []))}".lower()
    return 100 if any(p and p in text for p in preferences) else 50


def _explain(candidate: dict[str, Any], task: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    if candidate["skillFit"] >= 75:
        reasons.append("Strong match for the required skills")
    elif candidate["skillFit"] >= 45:
        reasons.append("Partial match for the required skills")
    else:
        reasons.append("Limited skill match; team-lead review recommended")
    if candidate["workloadScore"] >= 75:
        reasons.append("Relatively available compared with the stated workload")
    if candidate["available"] >= 90:
        reasons.append("Daily capacity is suitable for the project plan")
    if candidate["preference"] == 100:
        reasons.append("Matches the member's stated preferences")
    if not task.get("requiredSkills"):
        reasons.append("Task has no explicit required skills; estimate has lower confidence")
    return reasons


def recommend_assignments(tasks: list[dict[str, Any]], members: list[dict[str, Any]], project: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    project = project or {}
    state = {}
    for member in members:
        mid = str(member["id"])
        weekly = float(member.get("weeklyCapacityHours", float(member.get("hoursPerDay", project.get("hoursPerWorkday", 6))) * 5))
        state[mid] = {"assignedHours": 0.0, "weeklyCapacity": max(1.0, weekly), "currentLoad": float(member.get("currentLoadHours", 0))}

    results = []
    for original_task in tasks:
        task = dict(original_task)
        candidates = []
        for member in members:
            load_state = state[str(member["id"])]
            skill_fit = match_skill_score(task.get("requiredSkills", []), member)
            initial_ratio = _initial_load(member)
            planned_ratio = (load_state["currentLoad"] + load_state["assignedHours"]) / load_state["weeklyCapacity"]
            workload_score = max(0, min(100, round(100 - max(initial_ratio, planned_ratio) * 65)))
            available = _availability_score(member, project)
            preference = _preference_score(task, member)
            score = round(skill_fit * 0.62 + workload_score * 0.23 + available * 0.10 + preference * 0.05)
            candidates.append({"member": member, "score": score, "skillFit": skill_fit,
                               "workloadScore": workload_score, "available": available,
                               "preference": preference})
        candidates.sort(key=lambda c: (-c["score"], str(c["member"].get("name", "")).lower()))
        best = candidates[0] if candidates else None
        alternatives = []
        for candidate in candidates[:3]:
            member = candidate["member"]
            alternatives.append({
                "memberId": member["id"], "memberName": member["name"],
                "score": candidate["score"], "skillFit": candidate["skillFit"],
                "workloadScore": candidate["workloadScore"], "reasons": _explain(candidate, task),
            })
        selected = best if best and (best["skillFit"] >= 20 or not project.get("includeUnassigned", False)) else None
        if selected:
            state[str(selected["member"]["id"])]["assignedHours"] += float(task.get("estimateHours", 0) or 0)
        task["assignment"] = None
        if selected:
            task["assignment"] = {
                "memberId": selected["member"]["id"], "memberName": selected["member"]["name"],
                "score": selected["score"],
                "confidence": "high" if selected["score"] >= 80 else "medium" if selected["score"] >= 60 else "low",
                "reasons": _explain(selected, task),
            }
        task["alternatives"] = alternatives
        results.append(task)
    return results
