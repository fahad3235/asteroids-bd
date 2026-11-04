/* Node unit tests for asteroids-bd logic.js. Run: node tests/logic.test.js */
const assert = require('node:assert');
const L = require('../logic.js');
let n = 0;
function ok(name, fn) { n++; fn(); console.log('ok ' + n + ' - ' + name); }
function playing(seed) { const s = L.createGame(seed); s.status = 'playing'; return s; }

ok('level 1 spawns 4 large asteroids, all clear of the centre', () => {
  const s = L.createGame(42);
  assert.strictEqual(s.asteroids.length, 4);
  for (const a of s.asteroids) {
    assert.strictEqual(a.size, 'large');
    assert.ok(Math.hypot(a.x - 360, a.y - 240) >= 140, 'spawn too close to centre');
  }
});

ok('same seed gives identical fields; different seed differs', () => {
  const a = L.createGame(7), b = L.createGame(7), c = L.createGame(8);
  assert.deepStrictEqual(a.asteroids.map(x => [x.x, x.y]), b.asteroids.map(x => [x.x, x.y]));
  assert.notDeepStrictEqual(a.asteroids.map(x => [x.x, x.y]), c.asteroids.map(x => [x.x, x.y]));
});

ok('bullet hitting large asteroid: +20, splits into 2 mediums', () => {
  const s = playing(1);
  s.asteroids = [
    { size: 'large', r: 46, x: 100, y: 100, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(46) },
    { size: 'large', r: 46, x: 600, y: 400, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(46) }];
  s.ship = { x: 500, y: 100, vx: 0, vy: 0, angle: 0, invuln: 0, cooldown: 0, thrusting: false };
  s.bullets = [{ x: 100, y: 100, vx: 0, vy: 0, life: 0.9 }];
  const ev = L.step(s, {}, 0.016);
  assert.strictEqual(s.score, 20);
  assert.strictEqual(s.asteroids.length, 3);
  assert.ok(s.asteroids.filter(a => a.size === 'medium').length === 2);
  assert.ok(ev.some(e => e.type === 'split' && e.size === 'large'));
});

ok('medium splits into 2 smalls (+50); small vanishes (+100)', () => {
  const s = playing(1);
  const mk = (size, r, x) => ({ size, r, x, y: 100, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(r) });
  s.asteroids = [mk('medium', 26, 100), mk('small', 14, 600)];
  s.ship = { x: 500, y: 400, vx: 0, vy: 0, angle: 0, invuln: 0, cooldown: 0, thrusting: false };
  s.bullets = [{ x: 100, y: 100, vx: 0, vy: 0, life: 0.9 }];
  L.step(s, {}, 0.016);
  assert.strictEqual(s.score, 50);
  assert.strictEqual(s.asteroids.filter(a => a.size === 'small').length, 3); // 2 new + 1 untouched
  s.bullets = [{ x: 600, y: 100, vx: 0, vy: 0, life: 0.9 }];
  // Move ship far away so it cannot collide during the step.
  s.ship.x = 50; s.ship.y = 400;
  L.step(s, {}, 0.016);
  assert.strictEqual(s.score, 150);
  assert.strictEqual(s.asteroids.length, 2);
});

ok('ship collision loses a life and respawns invulnerable at centre', () => {
  const s = playing(1);
  s.asteroids = [{ size: 'small', r: 14, x: 100, y: 100, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(14) }];
  s.ship = { x: 100, y: 100, vx: 0, vy: 0, angle: 0, invuln: 0, cooldown: 0, thrusting: false };
  const ev = L.step(s, {}, 0.016);
  assert.strictEqual(s.lives, 2);
  assert.strictEqual(s.ship.x, 360); assert.strictEqual(s.ship.y, 240);
  assert.ok(s.ship.invuln > 0);
  assert.ok(ev.some(e => e.type === 'ship-down'));
  // While invulnerable the same overlap costs nothing.
  s.ship.x = 100; s.ship.y = 100;
  L.step(s, {}, 0.016);
  assert.strictEqual(s.lives, 2);
});

ok('third hit ends the game', () => {
  const s = playing(1);
  s.lives = 1;
  s.asteroids = [{ size: 'small', r: 14, x: 100, y: 100, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(14) }];
  s.ship = { x: 100, y: 100, vx: 0, vy: 0, angle: 0, invuln: 0, cooldown: 0, thrusting: false };
  L.step(s, {}, 0.016);
  assert.strictEqual(s.lives, 0);
  assert.strictEqual(s.status, 'over');
});

ok('clearing the field advances a level with fresh asteroids', () => {
  const s = playing(1);
  s.asteroids = [{ size: 'small', r: 14, x: 100, y: 100, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(14) }];
  s.ship = { x: 500, y: 400, vx: 0, vy: 0, angle: 0, invuln: 0, cooldown: 0, thrusting: false };
  s.bullets = [{ x: 100, y: 100, vx: 0, vy: 0, life: 0.9 }];
  const ev = L.step(s, {}, 0.016);
  assert.strictEqual(s.level, 2);
  assert.strictEqual(s.asteroids.length, 5); // 3 + level 2
  assert.ok(ev.some(e => e.type === 'level-clear'));
});

ok('extra life awarded when crossing 10000 points', () => {
  const s = playing(1);
  s.score = 9990; s.lives = 3;
  s.asteroids = [
    { size: 'small', r: 14, x: 100, y: 100, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(14) },
    { size: 'small', r: 14, x: 600, y: 400, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(14) }];
  s.ship = { x: 500, y: 200, vx: 0, vy: 0, angle: 0, invuln: 0, cooldown: 0, thrusting: false };
  s.bullets = [{ x: 100, y: 100, vx: 0, vy: 0, life: 0.9 }];
  const ev = L.step(s, {}, 0.016);
  assert.strictEqual(s.score, 10090);
  assert.strictEqual(s.lives, 4);
  assert.ok(ev.some(e => e.type === 'extra-life'));
});

ok('fire cooldown blocks a second shot within 0.18s', () => {
  const s = playing(1);
  s.ship.cooldown = 0;
  s.asteroids = [{ size: 'large', r: 46, x: 650, y: 430, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(46) }];
  L.step(s, { fire: true }, 0.01);
  assert.strictEqual(s.bullets.length, 1);
  L.step(s, { fire: true }, 0.01);
  assert.strictEqual(s.bullets.length, 1);
  L.step(s, { fire: true }, 0.2);
  assert.strictEqual(s.bullets.length, 2);
});

ok('bullet expires after its lifetime', () => {
  const s = playing(1);
  s.bullets = [{ x: 360, y: 240, vx: 0, vy: 0, life: 0.05 }];
  s.asteroids = [];
  s.ship = { x: 50, y: 50, vx: 0, vy: 0, angle: 0, invuln: 0, cooldown: 0, thrusting: false };
  // Keep one distant asteroid so the field is not "cleared" by the expiry path.
  s.asteroids = [{ size: 'large', r: 46, x: 650, y: 430, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(46) }];
  L.step(s, {}, 0.1);
  assert.strictEqual(s.bullets.length, 0);
});

ok('ship wraps around screen edges', () => {
  const s = playing(1);
  s.ship.x = 720 + 61; s.ship.y = 240; s.ship.vx = 0; s.ship.vy = 0;
  s.asteroids = [{ size: 'large', r: 46, x: 650, y: 430, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(46) }];
  L.step(s, {}, 0.016);
  assert.ok(s.ship.x < 0, 'expected wrapped x < 0, got ' + s.ship.x);
});

ok('thrust accelerates the ship along its angle', () => {
  const s = playing(1);
  s.ship.angle = -Math.PI / 2; // pointing up
  s.asteroids = [{ size: 'large', r: 46, x: 650, y: 430, vx: 0, vy: 0, rot: 0, vr: 0, verts: Array(11).fill(46) }];
  L.step(s, { thrust: true }, 0.5);
  assert.ok(s.ship.vy < 0, 'expected upward velocity, got ' + s.ship.vy);
  assert.ok(Math.abs(s.ship.vx) < 1e-6);
});

console.log('ALL ' + n + ' UNIT CHECKS PASSED');
