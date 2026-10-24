# CogniFlow backend

Express + MongoDB (Mongoose) + Socket.IO. It stores everything the React app used to keep in localStorage, enforces who is allowed to do what, pushes live updates, and talks to the Python AI recommender on the app's behalf.

```
React app ──HTTP + WebSocket──▶ this API ──▶ MongoDB
                                   └──HTTP──▶ Python AI recommender (port 8787)
```

## 1. Get a free database (MongoDB Atlas)
1. Create an account at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. **Database Access** → add a database user (username + password; avoid `@ : /` in the password).
3. **Network Access** → add your IP (for development "Allow access from anywhere" `0.0.0.0/0` is fine; tighten it before launch).
4. **Connect → Drivers** → copy the connection string and add the database name: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/cogniflow?retryWrites=true&w=majority`

(Or run MongoDB locally and use `mongodb://127.0.0.1:27017/cogniflow`.)

## 2. Run it
```bash
npm install
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm run seed                # loads the demo workspace (optional)
npm run dev                 # http://localhost:4000
npm run smoke               # 50-step end-to-end check (needs the API running)
```
Seeded demo accounts: `meera@cogniflow.dev` (team leader), `rohan@…`, `ananya@…`, `kabir@…`, `sara@…`, `dev@…`, `isha@…`, `vikram@…` — all with password `Password123!`.
`npm run seed` wipes the CogniFlow collections and refuses to run when `NODE_ENV=production` unless you add `--force`.

## What it enforces (server-side)
- Login with hashed passwords and an httpOnly cookie; login/signup attempts are throttled.
- Only a project's leader can add milestones/tasks, manage the team, assign work, apply AI plans, bulk-reschedule, or terminate it.
- Only a task's owner (or the leader) can move it; blocked tasks can't be started; "done" only through review by someone other than the owner (the leader may approve).
- People only receive projects they belong to; personal tasks/milestones are private; task preferences are visible only to their author and the project's leader.

## API (all under `/api`, cookie auth)
| | |
|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me` | accounts |
| `GET /bootstrap` | everything the signed-in user may see, in the React store's shape |
| `POST /projects`, `DELETE /projects/:id` | create / terminate |
| `POST /projects/:id/milestones`, `/team`, `DELETE /projects/:id/team/:uid` | milestones, members |
| `POST /projects/:id/tasks`, `/tasks/bulk`, `/assign-bulk`, `/ai/apply` | tasks, bulk edit, approve AI plan |
| `PATCH /tasks/:id/status`, `POST /tasks/:id/progress`, `/approve`, `/assign`, `/interest`, `PUT /prefs` | task actions |
| `POST /me/milestones`, `/me/tasks`, `DELETE /me/milestones/:id`, `DELETE /tasks/:id` | personal space |
| `GET /ai/health`, `POST /ai/projects/:id/plan`, `/ai/projects/:id/assignments` | AI recommender bridge |

Every write returns `{patch}` and broadcasts the same patch over Socket.IO (`patch` event, rooms `project:<id>` and `user:<id>`). A patch looks like `{projects, tasks, log, prefs, pms, removed:{projects,tasks,pms}}` and clients merge it by id. A `resync` event means "membership changed, call `/bootstrap` again".

## Deploying
Set `NODE_ENV=production`, a strong `JWT_SECRET`, `MONGODB_URI`, `CLIENT_ORIGIN` (your site) and `AI_SERVICE_URL`. Serve the API and the website from the same site (or a reverse proxy for `/api` and `/socket.io`) so the login cookie is first-party.
