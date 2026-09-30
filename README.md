# picktogether

A small app for making group decisions. Someone asks a question like "Where should we eat Friday?" and shares the room link. Everyone adds options (typed in, or found with a Google Maps search) and votes, and the counts update live for everyone. A weather check helps with outdoor plans, and an AI button gives a short summary of where the vote stands.

**Live:** https://picktogether.app.space

Built on [DeepSpace](https://docs.deep.space) (React + Cloudflare Workers).

## Main flow

1. **Sign in.**
2. **Create a room** on the home page by typing a question.
3. **Share the link.** The room page has a "Copy room link" button. Anyone signed in who has the link can join.
4. **Add options.** Anyone in the room can type one in, or use **Find places** to search Google Maps (e.g. "pizza in Buffalo NY") and add a real place in one click.
5. **Vote live.** Click an option to vote. Click another option to move your vote, or click your choice again to take the vote back. Counts update for everyone without a refresh.
6. **Check the weather** (optional). Type a city to see the next 5 days, which helps with outdoor plans.
7. **AI summary.** "Summarize with AI" gives 2–3 sentences: which option is winning, how close the vote is, and a friendly recommendation. If nobody has voted yet, it just says "No votes yet."

## DeepSpace features used, and why

- **Auth.** Votes need a real identity so each person gets one vote. The room page sits under `src/pages/(app)/(protected)/`, so opening a room requires sign-in.
- **Collections and live sync.** There are three collections: `rooms`, `options` and `votes` (`src/schemas/`). Each has server-side permission rules: anyone signed in can read and add, and you can only change or delete your own rows. The room page reads them with `useQuery`, which is a live subscription. When anyone writes, the server pushes the change to every open browser. That's the whole live-update system: no polling, and no code of my own for WebSockets.
- **Server actions.** All three integrations below are called from server actions in `src/actions/index.ts`. The browser sends only a small input, like a room id or a city. The server makes the call through DeepSpace's integration proxy, so there's no API key in the code or the browser. It sends back only what the page shows. Each action refuses empty or overly long input before making a paid call.

### Integrations (3)

| Integration | Where | Why it helps the group decide | Cost per call |
|---|---|---|---|
| `anthropic/chat-completion` (Claude `claude-haiku-4-5`) | `summarizeRoom`, "Summarize with AI" button | Turns the counts into 2–3 plain sentences: who's winning, how close it is, and a friendly recommendation. The server loads the votes itself, so a caller can't fake the counts. No votes means no AI call. | Metered at actual token cost, a fraction of a cent per summary (max 200 output tokens) |
| `openweathermap/forecast` | `getForecast`, "Check the weather" box | Rain or cold can settle outdoor plans ("Hiking or movies?"). Shows the next 5 days as one line per day: high, low and conditions. | $0.00195 |
| `serpapi/places-search` (Google Maps) | `searchPlaces`, "Find places" box | Fills in real options instead of everyone typing names. Shows the top 5 places with rating, type and address. **Add** turns one into a normal option. | $0.0325 |

**Skipped on purpose:** payments, file uploads/storage, messaging/chat, collaborative text editing (Yjs) and cron/background jobs. None of them help a group make a decision. Among the other integrations, I passed on `serpapi/events` (narrower than place search), `websearch` / `exa` (general web search, pricier and less focused), and Google Calendar (every user would need to connect their own Google account).

## Main tradeoffs

- **Vote counts are computed, not stored.** Each screen counts the vote records. A stored counter could lose votes when two people vote at the same moment.
- **One vote per person per room.** The server enforces this: `userId` is filled in by the server (`userBound`), and `uniqueOn: ['roomId', 'userId']` blocks a second vote. Changing your vote updates the existing one. It's simple and fair, but it doesn't support "approve several options."
- **The AI summary, weather and search results are shown only to the person who clicked.** They aren't saved or synced to others; this keeps things small. Places you **Add** do become normal options and sync to everyone.
- **My account pays for all integration calls.** They use developer billing, so voters don't need credits. The downside is that any signed-in user can spend some of my credit. Summaries and weather are cheap. Place search is the costly one, at $0.0325 per search (about $3.25 per 100).

## What the agent did vs. what I verified

I built this with an AI coding agent (Claude Code), one step at a time. After each step I tested it before moving on. This section follows my build notes (`NOTES.md`).

| Step | Agent did | I verified |
|---|---|---|
| Setup | — | Set up Node, Git and the DeepSpace CLI. Created the app and deployed to picktogether.app.space. App runs locally and the live link opens. |
| Plan | Proposed 3 collections: rooms, options, votes. | I chose one vote per person per room (simpler, server-enforced), and vote counts computed from votes rather than stored (avoids race conditions). |
| 1. Rooms | Wrote the 3 schemas, the "Create room" form and the room page. | Created a room; the question shows on the room page; copy link works. |
| 2. Options + voting | Built options, voting and live counts. Wrote a two-user Playwright test. | Tested by hand: add options, vote, change vote (total stays 1). Ran the two-user test myself: 4 passed. |
| Deploy | — | Deployed to picktogether.app.space. Tested create room, add options and vote on the live site. |
| 3. AI summary | Built a server action using DeepSpace's built-in Claude integration (Haiku), with no API key in code or browser. The server counts votes itself, and no votes means no AI call. Wrote API tests for signed-out, no-votes and unknown-room cases. | "No votes yet" works. After voting, the summary correctly said Thai is winning. Ran `tests/api.spec.ts` myself: 4 passed. |
| Redeploy | — | Redeployed after step 3. Tested the AI summary on the live site: room "Weekend plan?", voted Hiking; the summary correctly said Hiking is winning. |
| 4. Weather | Built a `getForecast` server action using the built-in `openweathermap/forecast` integration, plus a "Check the weather" box on the room page. | Buffalo showed 5 days (Thu 21°/15°C, matches my local weather). "asdfqwerty" showed a clear red error. |
| 5. Place search | Built a `searchPlaces` server action using the built-in `serpapi/places-search` integration, plus a "Find places" box that adds a result as an option in one click. | "pizza in Buffalo NY" showed 5 real places with ratings. I added La Nova; it appeared in options, the button changed to Added, and I voted on it (1 vote). "Buffalo ,NY" alone showed "No places found." |

## Known limits / what I'd do next

- **You can't edit or delete options.** Next: let the person who added an option edit or delete it, and remove the votes on it at the same time.
- **Duplicate option names are allowed when typed by hand.** Place search already shows "Added" for places in the room, but the "Add an option" box doesn't check. Next: block duplicates on the server, ignoring case and spaces.
- **The summary isn't shared live.** Next: save it in a `summaries` collection so everyone in the room sees the latest one.
- **No limit on paid calls.** Next: limit how often each person can search places or request a summary.
- Also worth adding: a "my rooms" list on the home page, and saving the room's city so everyone sees the same weather.

## Run locally

Requirements: Node, npm and the DeepSpace CLI (via `npx`).

```sh
npm install
npx deepspace auth login      # opens the browser to sign in
npx deepspace dev start       # local app at the URL it prints (usually http://localhost:5173)
```

The AI summary, weather and place search work locally too. They're billed to the logged-in developer account.

## Run tests

Tests use Playwright with real local services. The multi-user tests need two test accounts. They're created once per machine and saved in `~/.deepspace/test-accounts.json`:

```sh
npx deepspace test accounts create --email tester-a@deepspace.test --name "Tester A" --password-stdin
npx deepspace test accounts create --email tester-b@deepspace.test --name "Tester B" --password-stdin
```

Run the specs one file at a time. The runner only picked up the first file when given two. `--port` avoids clashing with a running dev server:

```sh
npx deepspace test run tests/api.spec.ts --port 5190      # server actions: sign-in required, bad input refused
npx deepspace test run tests/collab.spec.ts --port 5190   # two-user live voting
npx deepspace test run tests/smoke.spec.ts --port 5190
```

The tests never make a real integration call (AI, weather or places), so they don't spend credits. Each run leaves a `__test-…__` room in your local dev data, since rooms can't be deleted yet.
