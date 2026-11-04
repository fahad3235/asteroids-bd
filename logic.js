/* Asteroids BD — pure game logic (no DOM). Shared by app.js and node tests.
 * Coordinates: logical playfield W x H. Angles in radians; 0 = pointing right,
 * ship angle -PI/2 = pointing up at spawn. All speeds in px/sec. */
(function (root) {
  var W = 720, H = 480;
  var SHIP_R = 12, BULLET_SPEED = 420, BULLET_LIFE = 0.9, FIRE_COOLDOWN = 0.18;
  var SIZES = { large: { r: 46, score: 20, speed: [30, 50] },
                medium: { r: 26, score: 50, speed: [50, 80] },
                small: { r: 14, score: 100, speed: [80, 120] } };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randRange(rng, lo, hi) { return lo + rng() * (hi - lo); }

  function spawnAsteroid(rng, size, x, y, level) {
    var spec = SIZES[size];
    var ang = randRange(rng, 0, Math.PI * 2);
    var spd = randRange(rng, spec.speed[0], spec.speed[1]) * (1 + (level - 1) * 0.05);
    return { size: size, r: spec.r, x: x, y: y,
             vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
             rot: randRange(rng, 0, Math.PI * 2),
             vr: randRange(rng, -1.5, 1.5),
             verts: makeVerts(rng, spec.r) };
  }

  function makeVerts(rng, r) {
    var v = [], n = 11;
    for (var i = 0; i < n; i++) v.push(randRange(rng, r * 0.75, r * 1.1));
    return v;
  }

  function spawnLevelAsteroids(rng, level) {
    var out = [], count = 3 + level, i, x, y, tries;
    for (i = 0; i < count; i++) {
      // Keep spawn points away from the centre so level 1 never starts lethal.
      tries = 0;
      do {
        x = randRange(rng, 0, W); y = randRange(rng, 0, H); tries++;
      } while (Math.hypot(x - W / 2, y - H / 2) < 140 && tries < 50);
      out.push(spawnAsteroid(rng, 'large', x, y, level));
    }
    return out;
  }

  function newShip() {
    return { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
             invuln: 3, cooldown: 0, thrusting: false };
  }

  function createGame(seed) {
    var rng = mulberry32(seed == null ? 12345 : seed);
    var s = { w: W, h: H, rng: rng, level: 1, score: 0, lives: 3,
              ship: newShip(), bullets: [], asteroids: [],
              status: 'ready', nextExtraLife: 10000 };
    s.asteroids = spawnLevelAsteroids(rng, 1);
    return s;
  }

  function wrap(o) {
    if (o.x < -60) o.x += W + 120; else if (o.x > W + 60) o.x -= W + 120;
    if (o.y < -60) o.y += H + 120; else if (o.y > H + 60) o.y -= H + 120;
  }

  function dist2(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy;
  }

  /* Advance the world by dt seconds. input: {left,right,thrust,fire} booleans.
   * Returns an events array: {type:'split'|'hit'|'ship-down'|'level-clear'|'extra-life'} */
  function step(s, input, dt) {
    var events = [], ship = s.ship, i, j, a, b, d;
    if (s.status !== 'playing' || dt <= 0) return events;

    if (input.left) ship.angle -= 4.5 * dt;
    if (input.right) ship.angle += 4.5 * dt;
    if (input.thrust) {
      ship.vx += Math.cos(ship.angle) * 300 * dt;
      ship.vy += Math.sin(ship.angle) * 300 * dt;
      ship.thrusting = true;
    } else ship.thrusting = false;
    // Mild drag so the ship stays controllable.
    ship.vx *= (1 - 0.3 * dt); ship.vy *= (1 - 0.3 * dt);
    ship.x += ship.vx * dt; ship.y += ship.vy * dt;
    wrap(ship);
    if (ship.invuln > 0) ship.invuln -= dt;
    if (ship.cooldown > 0) ship.cooldown -= dt;
    if (input.fire && ship.cooldown <= 0) {
      s.bullets.push({ x: ship.x + Math.cos(ship.angle) * 16,
                       y: ship.y + Math.sin(ship.angle) * 16,
                       vx: ship.vx + Math.cos(ship.angle) * BULLET_SPEED,
                       vy: ship.vy + Math.sin(ship.angle) * BULLET_SPEED,
                       life: BULLET_LIFE });
      ship.cooldown = FIRE_COOLDOWN;
      events.push({ type: 'fire' });
    }

    for (i = s.bullets.length - 1; i >= 0; i--) {
      b = s.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60)
        s.bullets.splice(i, 1);
    }
    for (i = 0; i < s.asteroids.length; i++) {
      a = s.asteroids[i];
      a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr * dt;
      wrap(a);
    }

    // Bullet vs asteroid.
    for (i = s.bullets.length - 1; i >= 0; i--) {
      b = s.bullets[i];
      for (j = s.asteroids.length - 1; j >= 0; j--) {
        a = s.asteroids[j];
        if (dist2(b, a) < (a.r + 3) * (a.r + 3)) {
          s.bullets.splice(i, 1);
          s.asteroids.splice(j, 1);
          s.score += SIZES[a.size].score;
          events.push({ type: 'split', size: a.size, score: s.score });
          if (a.size === 'large' || a.size === 'medium') {
            var next = a.size === 'large' ? 'medium' : 'small';
            s.asteroids.push(spawnAsteroid(s.rng, next, a.x, a.y, s.level));
            s.asteroids.push(spawnAsteroid(s.rng, next, a.x, a.y, s.level));
          }
          if (s.score >= s.nextExtraLife) {
            s.lives += 1; s.nextExtraLife += 10000;
            events.push({ type: 'extra-life', lives: s.lives });
          }
          break;
        }
      }
    }

    // Ship vs asteroid (ignored while invulnerable after respawn).
    if (ship.invuln <= 0) {
      for (j = 0; j < s.asteroids.length; j++) {
        a = s.asteroids[j];
        if (dist2(ship, a) < (a.r + SHIP_R) * (a.r + SHIP_R)) {
          s.lives -= 1;
          events.push({ type: 'ship-down', lives: s.lives });
          if (s.lives > 0) {
            s.ship = newShip();
            s.bullets = [];
          } else {
            s.status = 'over';
          }
          break;
        }
      }
    }

    if (s.status === 'playing' && s.asteroids.length === 0) {
      s.level += 1;
      s.asteroids = spawnLevelAsteroids(s.rng, s.level);
      s.ship = newShip();
      s.bullets = [];
      events.push({ type: 'level-clear', level: s.level });
    }
    return events;
  }

  var api = { W: W, H: H, SHIP_R: SHIP_R, SIZES: SIZES, createGame: createGame,
              step: step, mulberry32: mulberry32, spawnAsteroid: spawnAsteroid,
              spawnLevelAsteroids: spawnLevelAsteroids, newShip: newShip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AsteroidsLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
