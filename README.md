# Asteroids BD

Offline bilingual (English / Bangla) arcade space shooter for the browser.
Fly a ship through an asteroid field, blast rocks into smaller pieces, survive
as many levels as you can, and chase the local best score.

## Features

1. **Real arcade gameplay** — rotate / thrust with inertia, shoot, and watch
   large asteroids split into mediums and then smalls (20 / 50 / 100 points).
2. **Lives, levels, extra life** — 3 lives, a new field each cleared level with
   more and faster asteroids, and a bonus life every 10,000 points.
3. **Full controls** — keyboard (arrows / WASD, Space, H hyperspace jump,
   P pause) plus on-screen touch buttons for phones.
4. **Bilingual UI** — English / Bangla toggle, persisted, with Bangla digits
   in the HUD; best score persisted in localStorage.
5. **Pause, restart, sound** — pause/resume overlay, new-field restart,
   and a WebAudio bleeps toggle (off by default only if you switch it off).
6. **Hyperspace jump** — teleport to a random safe spot with brief
   invulnerability when you are cornered.

## Stack

Vanilla HTML + CSS + JavaScript. No frameworks, no build step, no network
requests. Game logic lives in `logic.js` (pure, DOM-free, shared by the app
and the node tests); rendering and input live in `app.js`.

## Prerequisites

Any modern browser. Node.js 18+ only if you want to run the tests.

## Run locally

```sh
# Option 1: open the file directly
open index.html

# Option 2: serve it (any static server works)
npx serve .
```

## Testing

```sh
node tests/logic.test.js   # 12 unit checks (physics, collisions, scoring, levels)
node tests/smoke.mjs       # 15 headless-Chrome checks (start, jump, pause,
                           #   Bangla toggle + digits, reload persistence, 390px)
```

Both suites pass with zero console errors and zero page exceptions.
Test results are recorded in `TEST_RESULTS.md`.

## Deployment

Static site — publish the folder as-is with GitHub Pages (main branch,
root), Netlify, or any static host.

## Limitations

- Scores live only in this browser (localStorage); there is no online
  leaderboard and no account.
- Sound uses WebAudio bleeps, not music or recorded effects.
- This is a casual fan-style arcade game written from scratch; it is not
  affiliated with any classic arcade title.

## Status

Complete MVP. Offline, zero network requests, ships with no preset scores.
