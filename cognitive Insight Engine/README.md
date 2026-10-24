# CogniFlow AI Recommender (Python)

A **standalone backend module** for the CogniFlow hackathon project. This repository contains no frontend, general project-management CRUD, authentication, or database integration. Your main backend can call this service over HTTP and store the approved results in its existing database.

## Stack

- Python 3.11+
- FastAPI + Uvicorn
- Pydantic request validation
- Google Gen AI Python SDK (`google-genai`) for Gemini task generation
- Deterministic fallback planning when Gemini is not configured or unavailable
- Python scheduling and skill-scoring algorithms

## Features

- Understand the project brief and generate tasks with skills, hours, dependencies, and milestone groupings.
- Recommend team members based on skill fit, workload, daily availability, and preferences.
- Calculate task dates, milestone dates, and expected/recommended/conservative project deadlines.
- Validate task dependencies and remove unknown, self-referencing, or cycle-forming links with a response warning, so a draft schedule can still be calculated.
- Use rule-based fallback generation to keep a demo working without an API key or if Gemini is rate-limited.
- Expose automatic interactive API documentation at `/docs`.

AI-generated plans and delivery forecasts require team-lead review; estimates are not guarantees.

## Run locally

Requires Python 3.11 or newer.

### Windows PowerShell

```powershell
cd cogniflow-ai-recommender-python
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Optional: add GEMINI_API_KEY from Google AI Studio to .env
uvicorn main:app --reload --port 8787
```

### macOS/Linux

```bash
cd cogniflow-ai-recommender-python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# Optional: add GEMINI_API_KEY from Google AI Studio to .env
uvicorn main:app --reload --port 8787
```

Open `http://localhost:8787/docs` for interactive Swagger API documentation.

**Free-tier build verification:** `GET /health` must include `"buildVersion": "free-tier-v1"`. This version is configured for a Google AI Studio free-tier workflow: it keeps the already-tested `gemini-3.8-flash` model, uses low thinking, caps AI-generated plans at 8 tasks by default, shortens generated descriptions, makes one API request per new plan, and caches successful identical plans in memory for 15 minutes. It does not use paid-only tools, search grounding, or automatic application-level retries. The output limit defaults to 3072 tokens. A lower output cap is only a hard ceiling, not a guarantee of lower latency; task count and low thinking are the main safeguards.

The cache is process-local and is cleared on server restart. `plan.cacheHit: true` means the returned plan was reused and no new Gemini request was made. To force a fresh generation, change a relevant project/team input or set `GEMINI_CACHE_TTL_SECONDS=0` and restart the service.

## API endpoints

- `GET /health`: service status, whether a Gemini key is configured, and selected model.
- `POST /api/plan`: accepts project + team member profiles; returns tasks, recommended assignments, milestones and timeline. Omit the `tasks` property to ask Gemini to generate a breakdown. If `tasks` are supplied, Gemini generation is skipped and those tasks are scheduled.
- `POST /api/assignments/recommend`: scores candidate team members for existing tasks.
- `POST /api/schedule/estimate`: estimates dates for supplied tasks only; it does not call Gemini. Invalid/circular dependency links are removed where possible and reported in `warnings`.

## Troubleshooting: circular dependency error

A task dependency cycle means Task A waits for Task B while Task B also waits for Task A. The API now removes the specific invalid/cycle-forming dependency link and returns a `warnings` entry telling the team lead to review the repaired plan.

To test actual Gemini generation, call `POST /api/plan` with `project`, `teamMembers`, and `options`, and **omit `tasks`**. If the request contains `tasks`, the endpoint intentionally skips Gemini. `POST /api/schedule/estimate` always works only with the task list supplied by the caller and does not contact Gemini.

## Main endpoint request

Send `sample-request.json` to `POST /api/plan`. The input shape is:

```json
{
  "project": {
    "title": "Employee Management Portal",
    "description": "Build employee profiles, attendance, leave management and reporting.",
    "startDate": "2026-10-26",
    "targetDeadline": "2026-11-20",
    "workingDaysPerWeek": 5,
    "hoursPerWorkday": 6
  },
  "teamMembers": [
    {
      "id": "u1",
      "name": "Aarav",
      "skills": [{ "name": "React", "level": "advanced" }, "UI/UX"],
      "hoursPerDay": 4,
      "weeklyCapacityHours": 20,
      "currentLoadHours": 3
    }
  ],
  "options": { "maxTasks": 14, "contingencyPercent": 15, "includeUnassigned": false }
}
```

The complete request must have at least one team member. Skill levels can be text (`beginner`, `intermediate`, `advanced`, `expert`) or numeric 0-4. Simple skills arrays like `['React', 'Testing']` are accepted too. `skills` can also be provided as an object such as `{"Python": 3, "React": "advanced"}`.

## Example cURL request

```bash
curl -X POST http://localhost:8787/api/plan \
  -H "Content-Type: application/json" \
  --data-binary @sample-request.json
```

In Windows PowerShell:

```powershell
$body = Get-Content .\sample-request.json -Raw
Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/plan -ContentType 'application/json' -Body $body
```

## Configuration

Copy `.env.example` to `.env` and set:

- `GEMINI_API_KEY`: optional for fallback mode; required to use Gemini task generation.
- `GEMINI_MODEL`: defaults to `gemini-3.8-flash`, the model already verified in this demo. Keep it unless AI Studio confirms another model is available to the project.
- `GEMINI_THINKING_LEVEL`: defaults to `low` for faster interactive project drafts.
- `GEMINI_MAX_TASKS`: defaults to `8`, hard-capped at 12 by the API for small, free-tier-conscious drafts.
- `GEMINI_MAX_OUTPUT_TOKENS`: defaults to `3072`, bounded to 2048-4096.
- `GEMINI_CACHE_TTL_SECONDS`: defaults to `900` (15 minutes); 0 disables cache.
- `PORT`: default `8787` (Uvicorn's `--port` flag controls local server port).
- `CORS_ORIGINS`: comma-separated browser origins. Empty allows all origins for local development; explicitly set allowed origins before deployment.
- `GEMINI_REQUIRED`: `true` returns service unavailable when Gemini fails rather than using fallback; default `false` is better for a hackathon demo.

Get an API key in [Google AI Studio](https://aistudio.google.com/app/apikey). API availability, model access, and per-project free quotas vary. Google's limits include requests per minute, input tokens per minute, and requests per day. Check the project's actual quotas in AI Studio and review current [pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits). The free tier may use submitted content to improve Google's products, so use synthetic/demo data for the hackathon and never send the API key to the frontend.

## Connect from a Node.js backend

```js
const response = await fetch('http://localhost:8787/api/plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project, teamMembers, options: { maxTasks: 14 } })
});
if (!response.ok) throw new Error(`CogniFlow recommender failed: ${response.status}`);
const recommendation = await response.json();
// Let the team lead approve the generated plan before saving it.
```

The frontend should call your existing backend, not the AI service directly, if the main backend owns user sessions and permissions. Do not expose the Gemini key in browser code. Before sharing the service publicly, configure CORS and add authentication/authorization at your backend or gateway.

## Scheduling assumptions and limitations

- Estimates are MVP estimates, not calibrated predictions, until you have completed-task history.
- Tasks assigned to the same member are scheduled sequentially; dependencies are honored.
- This is a practical heuristic, not a full resource-constrained project scheduling solver. Holidays, partial-day scheduling, split tasks, and learned historical durations can be added later.
- Team lead review and approval should be required before assignments or dates become authoritative.

## Tests

```bash
python -m pytest -q
```

## Gemini references

- [Google Gen AI Python SDK](https://googleapis.github.io/python-genai/)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
