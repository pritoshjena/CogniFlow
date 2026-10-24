import json
from pathlib import Path
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
SAMPLE = json.loads((Path(__file__).parents[1] / "sample-request.json").read_text(encoding="utf-8"))


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["buildVersion"] == "free-tier-v1"
    assert response.json()["maxTasksPerAIPlan"] == 8


def test_plan_uses_fallback_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    response = client.post("/api/plan", json=SAMPLE)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["plan"]["generatedBy"] == "fallback"
    assert payload["tasks"]
    assert payload["milestones"]
    assert payload["timeline"]["recommendedDeadline"]
    assert payload["reviewRequired"] is True


def test_assignments_endpoint():
    body = dict(SAMPLE)
    body["tasks"] = [{"id": "T1", "title": "Build React UI", "requiredSkills": ["React"], "estimateHours": 4}]
    response = client.post("/api/assignments/recommend", json=body)
    assert response.status_code == 200, response.text
    recommendation = response.json()["recommendations"][0]
    assert recommendation["assignment"]["memberId"] == "u1"


def test_cycle_is_repaired_by_schedule_endpoint():
    body = dict(SAMPLE)
    body["tasks"] = [
        {"id": "T1", "title": "One", "estimateHours": 2, "dependsOn": ["T2"]},
        {"id": "T2", "title": "Two", "estimateHours": 2, "dependsOn": ["T1"]},
    ]
    response = client.post("/api/schedule/estimate", json=body)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["tasks"]
    assert any("circular" in warning for warning in payload["warnings"])


def test_cycle_is_repaired_by_plan_endpoint():
    body = dict(SAMPLE)
    body["tasks"] = [
        {"id": "T1", "title": "One", "estimateHours": 2, "dependsOn": ["T2"]},
        {"id": "T2", "title": "Two", "estimateHours": 2, "dependsOn": ["T1"]},
    ]
    response = client.post("/api/plan", json=body)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["plan"]["generatedBy"] == "provided"
    assert any("circular" in warning for warning in payload["warnings"])


def test_ai_plan_is_capped_for_free_tier(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    body = dict(SAMPLE)
    body["options"] = dict(SAMPLE["options"], maxTasks=10)
    response = client.post("/api/plan", json=body)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert len(payload["tasks"]) <= 8
    assert any("limited AI-generated tasks to 8" in warning for warning in payload["warnings"])
