"""Deterministic baseline plan used when Gemini is not configured or errors."""
from __future__ import annotations
from typing import Any
from .skills import all_team_skills


def _choose_skill(all_skills: list[str], patterns: list[str], fallback: list[str]) -> list[str]:
    match = next((skill for skill in all_skills if any(pattern in skill.lower() for pattern in patterns)), None)
    return [match] if match else fallback[:1]


def create_fallback_plan(project: dict[str, Any], members: list[dict[str, Any]], max_tasks: int = 8) -> dict[str, Any]:
    skills = all_team_skills(members)
    text = f"{project.get('title', '')} {project.get('description', '')}".lower()
    relevant = [s for s in skills if s.lower() in text]
    default_skill = [relevant[0]] if relevant else skills[:1]
    phases = [
        ("Discovery & Scope", [{"title": "Confirm requirements and acceptance criteria", "description": "Clarify the problem, intended users, constraints, success criteria and definition of done.", "skills": _choose_skill(skills, ["analysis", "planning", "documentation", "product"], default_skill), "hours": 4, "priority": "high", "deps": []}]),
        ("Design & Architecture", [{"title": "Design the solution and delivery approach", "description": "Define key components, interfaces, data flows and implementation sequence.", "skills": _choose_skill(skills, ["architecture", "design", "engineering", "planning"], default_skill), "hours": 6, "priority": "high", "deps": ["T1"]}]),
        ("Core Implementation", [
            {"title": "Implement the primary project capability", "description": f"Build the core functionality needed to deliver: {project.get('title', 'the project')}. Keep implementation aligned with approved scope.", "skills": relevant[:3] or default_skill, "hours": 16, "priority": "high", "deps": ["T2"]},
            {"title": "Implement supporting components and integration points", "description": "Build or connect supporting modules, interfaces, data handling and service boundaries.", "skills": _choose_skill(skills, ["api", "backend", "database", "integration"], default_skill), "hours": 12, "priority": "high", "deps": ["T2"]},
        ]),
        ("Validation & Quality", [{"title": "Test the end-to-end workflow and fix defects", "description": "Check acceptance criteria, edge cases, integrations and failure handling; resolve material defects before release.", "skills": _choose_skill(skills, ["testing", "qa", "quality"], default_skill), "hours": 8, "priority": "high", "deps": ["T3", "T4"]}]),
        ("Release & Handover", [{"title": "Prepare documentation and final handover", "description": "Document setup, decisions, known limitations and the demonstration or release procedure.", "skills": _choose_skill(skills, ["documentation", "docs", "communication"], default_skill), "hours": 4, "priority": "medium", "deps": ["T5"]}]),
    ]
    tasks = []
    for phase_name, phase_tasks in phases:
        for task in phase_tasks:
            if len(tasks) >= max_tasks:
                break
            idx = len(tasks) + 1
            tasks.append({
                "id": f"T{idx}", "title": task["title"], "description": task["description"],
                "requiredSkills": task["skills"] or default_skill, "estimateHours": task["hours"],
                "priority": task["priority"], "dependsOn": task["deps"],
                "milestoneName": phase_name, "deliverable": task["title"],
            })
        if len(tasks) >= max_tasks:
            break
    valid_ids = {t["id"] for t in tasks}
    for task in tasks:
        task["dependsOn"] = [dep for dep in task["dependsOn"] if dep in valid_ids]
    return {
        "summary": f"Fallback project plan for {project.get('title', 'this project')}. Review initial estimates before approving the schedule.",
        "assumptions": [
            "Estimates are rough starting points because no historical delivery data was provided.",
            "Task dependencies and durations must be reviewed by the team lead.",
            "Member profile skills are used for recommendations; unreported experience is not assumed.",
        ],
        "risks": [
            "The brief may omit requirements, integrations or compliance constraints.",
            "No historical cycle-time data was supplied, so the timeline includes a planning buffer.",
        ],
        "tasks": tasks, "generatedBy": "fallback",
    }
