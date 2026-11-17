# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

The following decisions describe the planned implementation, not completed functionality. Authentication remains a follow-up challenge.

- Presentation tier decision: Keep routing and Bootstrap presentation in React. Reuse the shared API client with relative `/api` paths and the existing Vite proxy. Each capability page must render API data and provide an accessible loading status, meaningful empty state, and error alert; do not move scoring or recommendation rules into the browser.
- Logic tier decision: Keep routes thin and preserve the existing response envelopes (`activities`, `activity`, `teams`, `team`, `leaderboard`, and `suggestions`). Implement input validation and business rules in the existing service layer. Forward deliberate 4xx errors through the existing error handler, and preserve explicit reporting of unexpected failures.
- Data tier decision: Complete required-field validation in the existing Mongoose models while preserving ObjectId relationships and the default empty team members array. Retain the passing seed behavior: repeatable fixtures, consistent user/team membership, and no deletion of unrelated records. MongoDB remains on port `27017`, Express on `8000`, and Vite on `5173`.
- Activity tracking approach: Validate `userId`, `teamId`, a non-empty activity type, and positive finite minutes. Check ID syntax before database lookups and confirm both referenced records exist; return deliberate 4xx errors without inserting invalid activities. Store the submitted references, type, and minutes, calculate one point per minute, and set `occurredAt` on creation. Preserve the existing list behavior.
- Team management approach: Validate a non-empty name and mascot, preserve submitted members, and default omitted members to an empty array. Reject malformed or nonexistent member references with a deliberate 4xx. Persist the submitted name and mascot and return them unchanged in create/list responses.
- Leaderboard approach: Aggregate stored activity points by team, resolve team names, sort totals highest first with a stable team-name/ID tie-breaker, and assign sequential 1-based ranks. Return the contract fields `teamName`, `totalPoints`, and `rank`; do not recalculate activity points in the UI.
- Workout suggestions approach: Resolve the user by email and return `404` when no user matches. Use that user's recent activities, newest first, to prioritize matching workout focus (for example, running/cycling for endurance and strength activity for strength), falling back to the user's fitness goal when no activity matches. Include an explanatory `reason` on each suggestion and return an empty suggestions array when no suitable workouts exist.

### Smallest safe implementation order

1. Complete model validation and rerun data contracts, preserving the passing seed test.
2. Implement team creation, then activity creation and reference validation; run the corresponding API tests after each change.
3. Implement leaderboard aggregation, then user-specific workout suggestions; run the corresponding API tests.
4. Connect one presentation page at a time through the shared client, covering loading, populated, empty, and error states.
5. Run all three contract suites and both builds. Keep each change small and add focused tests only for new behavior or gaps exposed during implementation.

## Test plan

### Observed baseline

The contract suites were run before implementation on 2026-11-17: **23 failed, 1 passed**. These are behavioral assertion failures, not test-environment startup failures.

| Check | Command | Observed result and meaning |
| --- | --- | --- |
| Data tier | `npm run test:data --prefix octofit-tracker/backend` | 4 failed, 1 passed. Required-field validation fails for users, teams, activities, and workouts. The idempotent seed test passes, including membership consistency and preservation of unrelated records. |
| API | `npm run test:api --prefix octofit-tracker/backend` | 4 failed. Activity and team creation return `501` where invalid requests should return `400`; leaderboard returns an empty array instead of ranked totals; workout suggestions omit the required explanation. |
| Frontend | `npm test --prefix octofit-tracker/frontend` | 15 failed. API-backed content and the user-specific workout request are missing, along with loading, empty, and accessible error states for all four capability pages. |
| Backend build | `npm run build --prefix octofit-tracker/backend` | Not run. Must pass TypeScript checking after implementation. |
| Frontend build | `npm run build --prefix octofit-tracker/frontend` | Not run. Must pass TypeScript checking and the Vite production build after implementation. |

API tests stop at their first failing assertion. Later checks, including successful activity/team creation, malformed and nonexistent activity references, the second user's workout suggestions, and unknown-user responses, are not yet verified by this baseline.

### Validation gates

- After model changes, rerun the data-tier command and require all five tests to pass, including the existing seed regression test.
- During service implementation, select the relevant tests with `npm run test:api --prefix octofit-tracker/backend -- -t "<test name>"`. Verify deliberate 4xx responses, no invalid activity inserts, preserved create/list fields, exact leaderboard totals and ranks, and personalized suggestions with reasons.
- During presentation implementation, use `npm test --prefix octofit-tracker/frontend -- -t "<test name>"` for focused checks. Confirm the specific user's workout URL and all four pages' populated, loading, empty, and error states.
- Before completion, run each of the five commands in the baseline table independently so one failing suite does not prevent the others from running. Require all contracts and both builds to pass.
- Finally, smoke-test the seeded application through Vite on `5173`, with API traffic proxied to private port `8000` and MongoDB on `27017`; confirm displayed data, team/activity creation through the API, rankings, and user-specific suggestions. This integration check has not yet been run.
