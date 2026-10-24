"""Request models for the public CogniFlow recommendation API."""
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SkillEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(min_length=1, max_length=80)
    level: str | int | float | None = None


SkillValue = str | SkillEntry


class TeamMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str | int
    name: str = Field(min_length=1, max_length=120)
    role: str | None = None
    skills: list[SkillValue] = Field(default_factory=list)
    proficiency: dict[str, str | int | float] = Field(default_factory=dict)
    experienceYears: float | None = Field(default=None, ge=0, le=80)
    hoursPerDay: float | None = Field(default=None, ge=0, le=16)
    weeklyCapacityHours: float | None = Field(default=None, ge=0, le=112)
    currentLoadHours: float = Field(default=0, ge=0, le=1000)
    preferences: list[str] = Field(default_factory=list)
    unavailableDates: list[str] = Field(default_factory=list)

    @field_validator("skills", mode="before")
    @classmethod
    def accept_skills_object(cls, value: Any) -> Any:
        # Also permit {"Python": 3, "React": "advanced"} for quick integrations.
        if isinstance(value, dict):
            return [{"name": key, "level": level} for key, level in value.items()]
        return value


class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str = Field(min_length=2, max_length=180)
    description: str = Field(default="Project description not supplied.", min_length=10, max_length=8000)
    startDate: str | None = None
    targetDeadline: str | None = None
    workingDaysPerWeek: int = Field(default=5, ge=1, le=7)
    hoursPerWorkday: float = Field(default=6, ge=1, le=16)
    timezone: str | None = None


class TaskInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str | int
    title: str = Field(min_length=1, max_length=180)
    description: str = ""
    requiredSkills: list[str] = Field(default_factory=list)
    estimateHours: float = Field(default=6, gt=0, le=240)
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    dependsOn: list[str | int] = Field(default_factory=list)
    milestoneName: str = "Delivery"
    deliverable: str = ""


class Options(BaseModel):
    model_config = ConfigDict(extra="ignore")
    maxTasks: int = Field(default=8, ge=4, le=12)
    contingencyPercent: float = Field(default=15, ge=0, le=60)
    includeUnassigned: bool = False


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project: Project
    teamMembers: list[TeamMember] = Field(min_length=1, max_length=60)
    # If tasks are supplied, use them instead of asking Gemini to generate a new breakdown.
    tasks: list[TaskInput] | None = Field(default=None, max_length=100)
    options: Options = Field(default_factory=Options)


class ExistingTasksRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project: Project
    teamMembers: list[TeamMember] = Field(min_length=1, max_length=60)
    tasks: list[TaskInput] = Field(min_length=1, max_length=100)
    options: Options = Field(default_factory=Options)
