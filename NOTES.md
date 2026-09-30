# Build notes

## Day 1
- Set up Node, Git, DeepSpace CLI
- Created picktogether, deployed to picktogether.app.space
- Verified: app runs locally and live link opens
   

## Plan
- Agent proposed 3 collections: rooms, options, votes.
- I chose: one vote per person per room (simpler, server-enforced).
- Vote counts computed from votes, not stored (avoids race conditions).

## Step 1 — Rooms (verified by me)
- Agent wrote 3 schemas, home "Create room" form, room page.
- I tested: create room, question shows on room page, copy link works.

## Step 2 — Options + voting (verified by me)
- Agent built options, voting, live counts.
- I tested manually: add options, vote, change vote (total stays 1).
- Agent wrote a two-user Playwright test; I ran it myself: 4 passed.

## Deploy (verified by me)
- Deployed to picktogether.app.space; tested create room, add options, vote on the live site.

## Step 3 — AI Summary (verified by me)
- Agent built a server action using DeepSpace's built-in Claude integration (Haiku). No API key in code or browser.
- Server counts votes itself; no votes = no AI call.
- I tested: "No votes yet" works; after voting, the summary correctly said Thai is winning.
- I ran tests/api.spec.ts myself: 4 passed.
- Known limit: my account pays for each summary, so any signed-in user can spend a little of my credit.

## Redeploy after Step 3 (verified by me)
- Redeployed to picktogether.app.space after step 3.
- Tested the AI summary on the live site: room "Weekend plan?", voted Hiking; the summary correctly said Hiking is winning.
