from cogniflow_ai import gemini_planner


def test_successful_plan_cache_prevents_second_ai_call(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_CACHE_TTL_SECONDS", "900")
    gemini_planner._PLAN_CACHE.clear()
    calls = []

    def fake_generate(**kwargs):
        calls.append(kwargs)
        return {
            "summary": "cached test plan",
            "assumptions": [],
            "risks": [],
            "tasks": [{"id": "T1", "title": "Test task", "dependsOn": []}],
            "generatedBy": "gemini",
        }

    monkeypatch.setattr(gemini_planner, "_generate_uncached", fake_generate)
    project = {"title": "Demo", "description": "Build a demo app"}
    members = [{"id": "u1", "name": "A", "skills": ["Python"]}]

    first = gemini_planner.generate_plan_with_gemini(project, members, 8)
    second = gemini_planner.generate_plan_with_gemini(project, members, 8)

    assert len(calls) == 1
    assert first["cacheHit"] is False
    assert second["cacheHit"] is True
    second["tasks"][0]["title"] = "mutated"
    third = gemini_planner.generate_plan_with_gemini(project, members, 8)
    assert third["tasks"][0]["title"] == "Test task"
    gemini_planner._PLAN_CACHE.clear()
