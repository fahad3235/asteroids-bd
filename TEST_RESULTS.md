# TEST RESULTS — asteroids-bd (run #239, 2026-11-04 18:00 slot)

## Unit tests — 12/12 pass (`node tests/logic.test.js`)

- Level 1 spawns 4 large asteroids, all at least 140px from the centre.
- Same seed gives an identical field; a different seed differs.
- Bullet vs large asteroid: score +20, splits into 2 mediums.
- Medium splits into 2 smalls (+50); small vanishes (+100).
- Ship collision: life lost, respawn at centre with invulnerability; no
  damage while invulnerable.
- Third hit ends the game (status `over`).
- Clearing the field advances to level 2 with 5 fresh asteroids.
- Extra life awarded when crossing 10,000 points (9990 + 100 = 10090, lives 3 -> 4).
- Fire cooldown blocks a second shot within 0.18s.
- Bullet expires after its lifetime.
- Ship wraps around screen edges.
- Thrust accelerates the ship along its facing angle.

## Headless-Chrome smoke — 15/15 pass (`node tests/smoke.mjs`)

Raw CDP against headless_shell-1187, file:// page: EN title renders, 720x480
canvas present, ready overlay visible, start hides overlay with status
`playing`, 4 asteroids on level 1, hyperspace moves the ship and grants
invulnerability, pause/resume overlay cycle, Bangla title + Bangla-digit HUD,
`lang="bn"`, Bangla title survives reload, 390px viewport with no horizontal
overflow, zero console errors, zero page exceptions.

## Repairs

0 app bugs, 0 test-harness fixes. One pre-test design note: the fire-cooldown
test pins its asteroid far from the ship so a stray bullet cannot collide
during the timing assertions.

## Sources

Bengali UI strings live in `app.js` as `\uXXXX` escapes (pure-ASCII file,
verified with grep: zero non-ASCII bytes), so the ASCII-only push transport
cannot corrupt them. `index.html`, `style.css`, `logic.js`, tests, README and
TEST_RESULTS are ASCII-only by construction.
