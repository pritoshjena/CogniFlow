# CogniFlow — merged React application

The app opens on the original CogniFlow login/create-account screen. The project-management workspace is shown only after the login page validates the credentials successfully. The sign-in experience is isolated in `public/login/index.html` so its original markup, CSS, validation, password reset and skill-selection behavior are retained without clashes with the main app styles.

## Run locally
1. Install Node.js (LTS).
2. In this project directory run `npm install`.
3. Run `npm run dev` and open the local Vite URL.
4. Create an account on the first screen, then sign in. The full project-management workspace opens only after successful authentication.

## What was merged
- Original styled login, account creation, password reset, form validation, password visibility and skill/proficiency selection.
- Full project-management frontend: Overview, Projects, Personal, Project overview, My work, Assign work, Team, Board, Workload, Dependencies, Contributions, Risks and existing project/task logic.
- Successful login sends a same-origin message to the React app. The app maps the login account to a workspace user and opens the workspace; failed login stays on the login screen.
- Sign out returns to the login screen. Login accounts are kept in browser `sessionStorage` for the current tab so sign-in works after logout or refresh within that tab. Workspace data continues to use the project's existing localStorage store.

## Prototype/security note
This is a front-end prototype, not production authentication. The original login logic runs in the browser and the account/password data is stored in `sessionStorage`; do not use real passwords or deploy it as secure authentication. A production app should authenticate against a backend, store password hashes server-side, and use secure sessions.


## New project resilience features

- **Project Time Machine** appears immediately after Project overview. This is the proactive planning workspace: create alternate schedules by intentionally moving planned task dates earlier/later or editing prerequisites. Compare forecast finish dates and changed-task impact, inspect downstream date shifts, and apply a chosen plan only after confirmation. It blocks circular dependencies and flags attempts to schedule work before an unfinished prerequisite. It does not inject emergencies.
- **Crash Test** appears directly after Project Time Machine and before Assign work. This is the resilience workspace: use presets for a people outage, deadline shock, dependency bottleneck, or combined worst case; inspect the disruption cascade; then compare Hold course, Rebalance the team, Critical-path sprint, and Combined recovery. A transparent heuristic highlights the best-fitting plan based on schedule slip, unassigned work, and number of task changes; it is not an AI probability or guaranteed forecast. Applying a plan requires confirmation.
- The two views share the project task/dependency data but have intentionally different jobs: Time Machine asks “Which planned future is better?” while Crash Test asks “When something breaks, how can we recover?” Time Machine uses a relative finish-date chart to compare planned futures; Crash Test uses disruption presets, an impact/cascade view, and response-plan comparison.
- Scenarios are stored locally in the browser per project. They are not shared across devices or team members until a server-backed database is added.
- Forecast finish is estimated as the latest due date among open tasks, and dependency cascades use a simple, transparent day-shift model. These are decision-support simulations, not guaranteed delivery forecasts.

## Accounts and projects (latest changes)
- **Signed-in accounts menu:** the account menu lists only accounts that have signed in during the current page session (a refresh clears it). Use "Sign in with another account" to add one; "Sign out" removes the current account.
- **Reset sample data was removed.**
- **Anyone can lead their own project:** the Projects tab has a "Start a new project" bar for every user. Whoever creates a project becomes its team leader and picks its members; in other people's projects they remain a member.

## Team recommendation and project termination
- **New project:** name, description, the skills/roles the project needs (with suggestions picked up from the name and description) and milestones. There is no member picker; the creator is the team leader.
- **Team box (Projects → open a project, above Recent activity):** the leader gets a blue **Team recommendation** button. Choose the needed skills and how many people to add; CogniFlow picks people who together cover the most still-weak skills (spare capacity breaks ties) and shows each person's match %, which is their average proficiency across the needed skills. The leader can tick or untick people, then **Approve team**. Approved members appear in the Team box with their skills and match %. **Add member** and **Remove member** are also leader-only (removing someone returns their open tasks to unassigned).
- **Terminate project:** a red section at the bottom of the project page, visible only to that project's leader. It requires typing the project name and permanently deletes the project, its tasks and its activity.
- "Git" was added to the skill list (and the login skills Git, JavaScript, HTML & CSS, APIs and Project planning now map to workspace skills).

## Milestone recommendation
- **Milestones box (Projects → open a project, above Team):** the leader gets a blue **Milestone recommendation** button and an **Add milestone** button. Members see the milestone ruler only.
- **Milestone recommendation:** the leader sets a project end date and a maximum number of milestones. CogniFlow reads the project name, description and required skills, picks the delivery phases that fit (for example Design and prototypes when UI/UX is needed, Model development when ML is needed), skips phases the project already has, and spaces the rest between today and the end date. Every suggestion can be renamed, re-dated or unticked before **Approve milestones**.
- **Add milestone:** a name and a date, added in date order.
- Both are leader-only. Dates are planning suggestions, not forecasts.

## AI recommender integration
The workspace talks to the separate **CogniFlow AI Recommender** (FastAPI, `cogniflow-ai-recommender-python`).

1. Start the recommender: `uvicorn main:app --port 8787` (add `GEMINI_API_KEY` to its `.env` for Gemini; without it the rule-based planner is used).
2. Start this app: `npm run dev`. Vite proxies `/ai-api/*` to `http://localhost:8787`, so no CORS setup is needed.
   Use `VITE_AI_PROXY_TARGET=http://host:port npm run dev` to point at another address.
3. Production: build with `VITE_AI_API_URL=https://<your-service>` and set the service's `CORS_ORIGINS` to this site's origin.

Where it appears (team leaders only):
- **Project page → AI project plan**: generates tasks, owners, milestones and a deadline estimate (`POST /api/plan`). Review, edit, then approve to import milestones, tasks, dependencies and owners.
- **Assign work → Ask AI recommender**: re-ranks owners for unassigned tasks (`POST /api/assignments/recommend`) with reasons.

Code: `src/aiClient.js` (API + data mapping), `src/components/AiPlanBox.jsx` (panel), `applyAiPlan` in `src/App.jsx`.
