"""Dependency-aware scheduler with an estimated project delivery window."""
from __future__ import annotations
from datetime import date, datetime, timedelta
from typing import Any


def parse_date(value: str | date | None) -> date:
    if value is None or value == "":
        return date.today()
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
        except (TypeError, ValueError):
            return date.today()


def is_workday(day: date, days_per_week: int) -> bool:
    weekday = day.weekday()  # Monday = 0
    if days_per_week >= 7:
        return True
    if days_per_week == 6:
        return weekday != 6
    if days_per_week == 5:
        return weekday < 5
    return weekday < days_per_week


def add_working_days(start: date, days: int, days_per_week: int = 5, unavailable_dates: set[str] | None = None) -> date:
    current = start
    remaining = max(0, int(days + 0.999999))
    unavailable_dates = unavailable_dates or set()
    while remaining > 0:
        current += timedelta(days=1)
        if is_workday(current, days_per_week) and current.isoformat() not in unavailable_dates:
            remaining -= 1
    return current


def working_days_between(start: date, end: date, days_per_week: int = 5) -> int:
    if end <= start:
        return 0
    count = 0
    current = start
    while current <= end:
        if is_workday(current, days_per_week):
            count += 1
        current += timedelta(days=1)
    return count


def topological_sort(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id = {str(task["id"]): task for task in tasks}
    if len(by_id) != len(tasks):
        raise ValueError("Task IDs must be unique.")
    incoming = {key: 0 for key in by_id}
    outgoing = {key: [] for key in by_id}
    for task in tasks:
        task_id = str(task["id"])
        for dependency in task.get("dependsOn", []) or []:
            dep_id = str(dependency)
            if dep_id not in by_id:
                raise ValueError(f"Task {task_id} depends on unknown task {dep_id}.")
            if dep_id == task_id:
                raise ValueError("Task dependencies contain a cycle. Remove circular dependencies and try again.")
            incoming[task_id] += 1
            outgoing[dep_id].append(task_id)
    ready = [str(task["id"]) for task in tasks if incoming[str(task["id"])] == 0]
    ordered = []
    while ready:
        task_id = ready.pop(0)
        ordered.append(by_id[task_id])
        for next_id in outgoing[task_id]:
            incoming[next_id] -= 1
            if incoming[next_id] == 0:
                ready.append(next_id)
    if len(ordered) != len(tasks):
        raise ValueError("Task dependencies contain a cycle. Remove circular dependencies and try again.")
    return ordered



def sanitize_dependencies(tasks: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    """Remove invalid dependency edges and break cycles before scheduling.

    Dependency links are directed from prerequisite -> dependent task. A link
    is dropped only when it references a missing task, points to itself, or
    would introduce a cycle in the links already accepted. This lets the API
    return a usable draft while explicitly warning the team lead to review it.
    """
    normalized = []
    ids: list[str] = []
    for index, original in enumerate(tasks, start=1):
        task = dict(original)
        task_id = str(task.get("id") or f"T{index}")
        task["id"] = task_id
        task["dependsOn"] = [str(dep) for dep in (task.get("dependsOn") or [])]
        normalized.append(task)
        ids.append(task_id)

    if len(set(ids)) != len(ids):
        raise ValueError("Task IDs must be unique. Assign each task a distinct ID before scheduling.")

    valid_ids = set(ids)
    outgoing: dict[str, list[str]] = {task_id: [] for task_id in ids}
    removed = 0

    def reachable(start: str, target: str) -> bool:
        pending = [start]
        visited: set[str] = set()
        while pending:
            node = pending.pop()
            if node == target:
                return True
            if node in visited:
                continue
            visited.add(node)
            pending.extend(outgoing.get(node, []))
        return False

    for task in normalized:
        task_id = task["id"]
        retained: list[str] = []
        seen: set[str] = set()
        for dep_id in task["dependsOn"]:
            if dep_id in seen:
                continue
            seen.add(dep_id)
            if dep_id not in valid_ids or dep_id == task_id:
                removed += 1
                continue
            # Adding dep -> task creates a cycle exactly when task already
            # reaches dep through previously accepted dependency links.
            if reachable(task_id, dep_id):
                removed += 1
                continue
            retained.append(dep_id)
            outgoing[dep_id].append(task_id)
        task["dependsOn"] = retained

    warnings = []
    if removed:
        warnings.append(
            f"Removed {removed} invalid or circular task dependency link(s) so the schedule could be calculated. "
            "Review task dependencies before approving this plan."
        )
    return normalized, warnings


def calculate_schedule(tasks: list[dict[str, Any]], members: list[dict[str, Any]], project: dict[str, Any], options: dict[str, Any] | None = None) -> dict[str, Any]:
    options = options or {}
    days_per_week = int(project.get("workingDaysPerWeek", 5))
    default_hours = float(project.get("hoursPerWorkday", 6))
    start_date = parse_date(project.get("startDate"))
    # Last-resort guard: even if a caller forgets to sanitize at the API layer,
    # invalid/circular dependency links must not crash timeline calculation.
    tasks, _internal_dependency_warnings = sanitize_dependencies(tasks)
    ordered = topological_sort(tasks)
    member_by_id = {str(member["id"]): member for member in members}
    member_next_day: dict[str, int] = {}
    by_id: dict[str, dict[str, Any]] = {}
    scheduled: list[dict[str, Any]] = []
    unavailable_by_member = {str(m["id"]): set(m.get("unavailableDates", []) or []) for m in members}

    for original in ordered:
        task = dict(original)
        dep_finish_day = max((by_id[str(dep)]["endOffsetWorkingDays"] for dep in task.get("dependsOn", []) if str(dep) in by_id), default=0)
        assignment = task.get("assignment")
        member = member_by_id.get(str(assignment.get("memberId"))) if assignment else None
        member_key = str(member["id"]) if member else None
        member_ready_day = member_next_day.get(member_key, 0) if member_key else 0
        start_offset = max(dep_finish_day, member_ready_day)
        hours = max(1.0, float(task.get("estimateHours", 1) or 1))
        available_hours = max(1.0, min(default_hours, float(member.get("hoursPerDay") or default_hours))) if member else max(1.0, default_hours)
        duration_days = max(1, int((hours / available_hours) + 0.999999))
        end_offset = start_offset + duration_days
        unavailable = unavailable_by_member.get(member_key, set()) if member_key else set()
        task.update({
            "estimateHours": hours,
            "durationWorkingDays": duration_days,
            "startOffsetWorkingDays": start_offset,
            "endOffsetWorkingDays": end_offset,
            "startDate": add_working_days(start_date, start_offset, days_per_week, unavailable).isoformat(),
            "dueDate": add_working_days(start_date, max(start_offset, end_offset - 1), days_per_week, unavailable).isoformat(),
        })
        scheduled.append(task)
        by_id[str(task["id"])] = task
        if member_key:
            member_next_day[member_key] = end_offset

    end_offset = max((task["endOffsetWorkingDays"] for task in scheduled), default=0)
    contingency_percent = float(options.get("contingencyPercent", 15))
    buffer_days = int((end_offset * contingency_percent / 100) + 0.999999)
    expected_days = end_offset
    recommended_days = max(1, end_offset + buffer_days)
    conservative_days = max(recommended_days, int((end_offset * 1.3) + 0.999999))
    expected_deadline = add_working_days(start_date, max(0, expected_days - 1), days_per_week).isoformat()
    recommended_deadline = add_working_days(start_date, max(0, recommended_days - 1), days_per_week).isoformat()
    conservative_deadline = add_working_days(start_date, max(0, conservative_days - 1), days_per_week).isoformat()
    target_deadline = parse_date(project["targetDeadline"]).isoformat() if project.get("targetDeadline") else None
    target_days = working_days_between(start_date, parse_date(target_deadline), days_per_week) if target_deadline else None

    milestone_map: dict[str, dict[str, Any]] = {}
    for task in scheduled:
        name = task.get("milestoneName") or "Delivery"
        if name not in milestone_map:
            milestone_map[name] = {"name": name, "taskIds": [], "deliverables": [], "dueDate": task["dueDate"], "startDate": task["startDate"]}
        milestone = milestone_map[name]
        milestone["taskIds"].append(task["id"])
        deliverable = task.get("deliverable")
        if deliverable and deliverable not in milestone["deliverables"]:
            milestone["deliverables"].append(deliverable)
        milestone["dueDate"] = max(milestone["dueDate"], task["dueDate"])
        milestone["startDate"] = min(milestone["startDate"], task["startDate"])
    milestones = [{"id": f"M{idx}", **milestone} for idx, milestone in enumerate(milestone_map.values(), start=1)]
    return {
        "tasks": scheduled, "milestones": milestones,
        "timeline": {
            "startDate": start_date.isoformat(), "expectedWorkingDays": expected_days,
            "bufferDays": buffer_days, "recommendedWorkingDays": recommended_days,
            "conservativeWorkingDays": conservative_days, "expectedDeadline": expected_deadline,
            "recommendedDeadline": recommended_deadline, "conservativeDeadline": conservative_deadline,
            "targetDeadline": target_deadline,
            "targetDeadlineAssessment": "not_provided" if target_days is None else "appears_feasible" if target_days >= recommended_days else "at_risk",
            "targetWorkingDays": target_days,
            "note": "Dates are estimates in working days. Task durations and assignments should be reviewed by the team lead; historical delivery data improves accuracy.",
        },
    }
