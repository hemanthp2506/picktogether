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
