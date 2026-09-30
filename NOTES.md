# Build notes

## Day 1
- Set up Node, Git, DeepSpace CLI
- Created picktogether, deployed to picktogether.app.space
- Verified: app runs locally and live link opens
   ## Day 1 — Plan
   - Agent proposed 3 collections: rooms, options, votes.
   - I chose: one vote per person per room (simpler, server-enforced).
   - Vote counts computed from votes, not stored (avoids race conditions).