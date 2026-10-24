"""Skill normalization and matching helpers."""
from __future__ import annotations
import re
from typing import Any

LEVEL_MAP = {
    "beginner": 1, "novice": 1, "junior": 1, "basic": 1,
    "intermediate": 2, "competent": 2, "mid": 2,
    "advanced": 3, "expert": 4, "senior": 3, "proficient": 3, "lead": 4,
}
SYNONYMS = {
    "js": "javascript", "node": "node.js", "nodejs": "node.js",
    "reactjs": "react", "react.js": "react", "ux": "ui ux", "ui/ux": "ui ux",
    "qa": "testing", "quality assurance": "testing", "test automation": "testing",
    "database design": "database", "mongodb": "database", "sql": "database",
    "technical writing": "documentation", "docs": "documentation",
    "api development": "api", "rest api": "api", "rest apis": "api",
    "machine learning": "ml", "artificial intelligence": "ai",
    "project management": "project planning", "frontend": "frontend development",
    "front end": "frontend development", "backend": "backend development",
    "back end": "backend development",
}


def canon(value: Any) -> str:
    value = str(value or "").lower().strip()
    value = re.sub(r"[._/-]+", " ", value)
    return re.sub(r"\s+", " ", value)


def skill_key(value: Any) -> str:
    c = canon(value)
    return SYNONYMS.get(c, c)


def level_number(value: Any) -> float:
    if isinstance(value, (float, int)) and not isinstance(value, bool):
        return max(0.0, min(4.0, value / 25 if value > 4 else float(value)))
    word = LEVEL_MAP.get(canon(value))
    if word:
        return float(word)
    try:
        parsed = float(value)
        return max(0.0, min(4.0, parsed / 25 if parsed > 4 else parsed))
    except (TypeError, ValueError):
        return 2.0


def normalize_skills(member: dict[str, Any]) -> dict[str, float]:
    out: dict[str, float] = {}
    raw_skills = member.get("skills") or []
    if isinstance(raw_skills, list):
        for entry in raw_skills:
            if isinstance(entry, str):
                out[canon(entry)] = 2.0
            elif isinstance(entry, dict) and entry.get("name"):
                name = str(entry["name"])
                out[canon(name)] = level_number(entry.get("level", (member.get("proficiency") or {}).get(name, 2)))
    elif isinstance(raw_skills, dict):
        out.update({canon(name): level_number(level) for name, level in raw_skills.items()})
    proficiency = member.get("proficiency") or {}
    if isinstance(proficiency, dict):
        out.update({canon(name): level_number(level) for name, level in proficiency.items()})
    return out


def match_skill_score(required_skills: list[str] | None, member: dict[str, Any]) -> int:
    required = list(dict.fromkeys(skill_key(s) for s in (required_skills or []) if skill_key(s)))
    if not required:
        return 55
    mapped = {skill_key(key): value for key, value in normalize_skills(member).items()}
    points = 0.0
    for req in required:
        best = mapped.get(req, 0.0)
        if not best:
            for key, level in mapped.items():
                if len(req) >= 4 and len(key) >= 4 and (req in key or key in req):
                    best = max(best, level * 0.8)
        points += min(1.0, best / 4.0)
    return round(points / len(required) * 100)


def all_team_skills(members: list[dict[str, Any]]) -> list[str]:
    skills: set[str] = set()
    for member in members:
        skills.update(normalize_skills(member).keys())
    return sorted(skills)
