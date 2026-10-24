from datetime import date
import pytest
from cogniflow_ai.assignment_engine import recommend_assignments
from cogniflow_ai.fallback_planner import create_fallback_plan
from cogniflow_ai.scheduler import calculate_schedule, sanitize_dependencies, topological_sort

MEMBERS = [
    {"id": "front", "name": "Frontend Member", "skills": [{"name": "React", "level": "advanced"}, {"name": "UI/UX", "level": 3}], "hoursPerDay": 6, "weeklyCapacityHours": 30, "currentLoadHours": 0},
    {"id": "back", "name": "Backend Member", "skills": [{"name": "Node.js", "level": 4}, {"name": "Database", "level": 4}], "hoursPerDay": 6, "weeklyCapacityHours": 30, "currentLoadHours": 2},
    {"id": "qa", "name": "QA Member", "skills": [{"name": "Testing", "level": 4}, {"name": "Documentation", "level": 2}], "hoursPerDay": 5, "weeklyCapacityHours": 25, "currentLoadHours": 0},
]


def test_assignment_ranks_skill_match_first():
    task = {"id": "T1", "title": "Build UI", "description": "Implement user interface", "requiredSkills": ["React"], "estimateHours": 4, "dependsOn": [], "milestoneName": "Build"}
    result = recommend_assignments([task], MEMBERS, {"hoursPerWorkday": 6})
    assert result[0]["assignment"]["memberId"] == "front"
    assert len(result[0]["alternatives"]) >= 2
    assert result[0]["assignment"]["reasons"]


def test_schedule_honors_dependencies_and_dates():
    tasks = [
        {"id": "T1", "title": "Design", "requiredSkills": ["UI/UX"], "estimateHours": 6, "dependsOn": [], "milestoneName": "Design", "assignment": {"memberId": "front", "memberName": "Frontend Member"}},
        {"id": "T2", "title": "Build", "requiredSkills": ["React"], "estimateHours": 12, "dependsOn": ["T1"], "milestoneName": "Build", "assignment": {"memberId": "front", "memberName": "Frontend Member"}},
    ]
    result = calculate_schedule(tasks, MEMBERS, {"startDate": "2026-10-26", "workingDaysPerWeek": 5, "hoursPerWorkday": 6}, {"contingencyPercent": 20})
    assert result["tasks"][0]["startDate"] == "2026-10-26"
    assert result["tasks"][1]["startDate"] > result["tasks"][0]["dueDate"]
    assert result["timeline"]["recommendedDeadline"] >= result["timeline"]["expectedDeadline"]
    assert len(result["milestones"]) == 2


def test_scheduler_rejects_cycle():
    tasks = [
        {"id": "T1", "title": "One", "estimateHours": 2, "dependsOn": ["T2"], "assignment": None},
        {"id": "T2", "title": "Two", "estimateHours": 2, "dependsOn": ["T1"], "assignment": None},
    ]
    with pytest.raises(ValueError, match="cycle"):
        topological_sort(tasks)


def test_fallback_end_to_end():
    project = {"title": "Demo Platform", "description": "Create a responsive app with API integration, database, and QA.", "startDate": "2026-10-26", "targetDeadline": "2026-11-20", "workingDaysPerWeek": 5, "hoursPerWorkday": 6}
    draft = create_fallback_plan(project, MEMBERS, 14)
    ids = {task["id"] for task in draft["tasks"]}
    assert len(draft["tasks"]) >= 4
    assert all(dep in ids for task in draft["tasks"] for dep in task["dependsOn"])
    assigned = recommend_assignments(draft["tasks"], MEMBERS, project)
    schedule = calculate_schedule(assigned, MEMBERS, project, {"contingencyPercent": 15})
    assert len(schedule["tasks"]) == len(draft["tasks"])
    assert len(schedule["milestones"]) >= 3
    assert all(task["assignment"] and task["startDate"] and task["dueDate"] for task in schedule["tasks"])


def test_sanitizer_removes_cycle_and_unknown_dependency():
    tasks = [
        {"id": "T1", "title": "One", "estimateHours": 2, "dependsOn": ["T2", "missing"]},
        {"id": "T2", "title": "Two", "estimateHours": 2, "dependsOn": ["T1"]},
    ]
    cleaned, warnings = sanitize_dependencies(tasks)
    assert len(cleaned) == 2
    assert cleaned[0]["dependsOn"] == ["T2"]
    assert cleaned[1]["dependsOn"] == []
    assert warnings and "circular" in warnings[0]
    # The repaired dependency graph must be schedulable.
    calculate_schedule(cleaned, MEMBERS, {"startDate": "2026-10-26"})


def test_calculate_schedule_repairs_cycles_as_final_safety_net():
    tasks = [
        {"id": "T1", "title": "One", "estimateHours": 2, "dependsOn": ["T2"]},
        {"id": "T2", "title": "Two", "estimateHours": 2, "dependsOn": ["T1"]},
    ]
    members = [{"id": "u1", "name": "Aarav", "skills": ["Python"], "hoursPerDay": 4}]
    project = {"title": "Cycle guard", "description": "Test timeline scheduling", "startDate": "2026-10-26"}
    schedule = calculate_schedule(tasks, members, project)
    assert len(schedule["tasks"]) == 2
    assert schedule["timeline"]["recommendedDeadline"]
