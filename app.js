/* Asteroids BD \u2014 canvas renderer + input + i18n. All visible text comes from I18N
 * below so index.html stays ASCII; this file is stored with Bengali as \uXXXX
 * escapes (see README) to survive ASCII-only push transport. */
(function () {
  'use strict';
  var L = window.AsteroidsLogic;
  var I18N = {
    en: { title: 'Asteroids BD', tag: 'Blast the rocks. Survive the field.',
      start: 'Start game', resume: 'Resume', paused: 'Paused', gameOver: 'Game over',
      playAgain: 'Play again', score: 'Score', lives: 'Lives', level: 'Level',
      best: 'Best', sound: 'Sound', soundOn: 'On', soundOff: 'Off',
      newMaze: 'New field', hyperspace: 'Jump',
      how: 'Arrow keys / WASD to fly, Space to shoot, H to jump, P to pause.',
      howTouch: 'Use the on-screen buttons to fly and shoot.',
      newBest: 'New best score!', finalScore: 'Final score',
      levelClear: 'Field cleared! Level ' },
    bn: { title: '\u0985\u09cd\u09af\u09be\u09b8\u09cd\u099f\u09c7\u09b0\u09af\u09bc\u09c7\u09a1\u09b8 \u09ac\u09bf\u09a1\u09bf', tag: '\u09aa\u09be\u09a5\u09b0\u0997\u09c1\u09b2\u09cb \u09ad\u09be\u0999\u09c1\u09a8\u0964 \u099f\u09bf\u0995\u09c7 \u09a5\u09be\u0995\u09c1\u09a8\u0964',
      start: '\u0996\u09c7\u09b2\u09be \u09b6\u09c1\u09b0\u09c1', resume: '\u0986\u09ac\u09be\u09b0 \u099a\u09be\u09b2\u09c1', paused: '\u09ac\u09bf\u09b0\u09a4\u09bf',
      gameOver: '\u0996\u09c7\u09b2\u09be \u09b6\u09c7\u09b7', playAgain: '\u0986\u09ac\u09be\u09b0 \u0996\u09c7\u09b2\u09c1\u09a8', score: '\u09b8\u09cd\u0995\u09cb\u09b0',
      lives: '\u099c\u09c0\u09ac\u09a8', level: '\u09b2\u09c7\u09ad\u09c7\u09b2', best: '\u09b8\u09c7\u09b0\u09be', sound: '\u09b6\u09ac\u09cd\u09a6',
      soundOn: '\u099a\u09be\u09b2\u09c1', soundOff: '\u09ac\u09a8\u09cd\u09a7', newMaze: '\u09a8\u09a4\u09c1\u09a8 \u09ae\u09be\u09a0',
      hyperspace: '\u09b2\u09be\u09ab', how: '\u09a4\u09c0\u09b0 \u099a\u09bf\u09b9\u09cd\u09a8 / WASD \u09a6\u09bf\u09af\u09bc\u09c7 \u0989\u09a1\u09bc\u09c1\u09a8, Space \u09a6\u09bf\u09af\u09bc\u09c7 \u0997\u09c1\u09b2\u09bf, H \u09a6\u09bf\u09af\u09bc\u09c7 \u09b2\u09be\u09ab, P \u09a6\u09bf\u09af\u09bc\u09c7 \u09ac\u09bf\u09b0\u09a4\u09bf\u0964',
      howTouch: '\u0989\u09a1\u09bc\u09a4\u09c7 \u0993 \u0997\u09c1\u09b2\u09bf \u0995\u09b0\u09a4\u09c7 \u09b8\u09cd\u0995\u09cd\u09b0\u09bf\u09a8\u09c7\u09b0 \u09ac\u09cb\u09a4\u09be\u09ae \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8\u0964',
      newBest: '\u09a8\u09a4\u09c1\u09a8 \u09b8\u09c7\u09b0\u09be \u09b8\u09cd\u0995\u09cb\u09b0!', finalScore: '\u099a\u09c2\u09a1\u09bc\u09be\u09a8\u09cd\u09a4 \u09b8\u09cd\u0995\u09cb\u09b0',
      levelClear: '\u09ae\u09be\u09a0 \u09aa\u09b0\u09bf\u09b7\u09cd\u0995\u09be\u09b0! \u09b2\u09c7\u09ad\u09c7\u09b2 ' }
  };
  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
  function digits(n, lang) {
    var s = String(n);
    if (lang !== 'bn') return s;
    return s.replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var lang = localStorage.getItem('asteroids-bd-lang') || 'en';
  var best = parseInt(localStorage.getItem('asteroids-bd-best') || '0', 10) || 0;
  var soundOn = localStorage.getItem('asteroids-bd-sound') !== 'off';
  var state = L.createGame(20261104);
  var input = { left: false, right: false, thrust: false, fire: false };
  var running = false, raf = null, lastT = 0, flashMsg = '', flashUntil = 0;
  var stars = [];
  for (var i = 0; i < 90; i++)
    stars.push({ x: Math.random() * L.W, y: Math.random() * L.H, r: Math.random() * 1.4 + 0.4 });

  var audioCtx = null;
  function beep(freq, dur, type) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio unavailable: game continues silently */ }
  }

  function t(key) { return I18N[lang][key]; }
  function el(id) { return document.getElementById(id); }

  function renderText() {
    el('title').textContent = t('title');
    el('tag').textContent = t('tag');
    el('how').textContent = t('how') + ' ' + t('howTouch');
    el('startBtn').textContent = state.status === 'over' ? t('playAgain') : t('start');
    el('pauseBtn').textContent = running ? t('paused') : t('resume');
    el('soundBtn').textContent = t('sound') + ': ' + (soundOn ? t('soundOn') : t('soundOff'));
    el('newBtn').textContent = t('newMaze');
    el('jumpBtn').textContent = t('hyperspace');
    el('langBtn').textContent = lang === 'en' ? '\u09ac\u09be\u0982\u09b2\u09be' : 'English';
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  }

  function renderHud() {
    el('hudScore').textContent = t('score') + ': ' + digits(state.score, lang);
    el('hudLives').textContent = t('lives') + ': ' + digits(state.lives, lang);
    el('hudLevel').textContent = t('level') + ': ' + digits(state.level, lang);
    el('hudBest').textContent = t('best') + ': ' + digits(Math.max(best, state.score), lang);
  }

  function draw() {
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, L.W, L.H);
    ctx.fillStyle = '#8ea2c9';
    stars.forEach(function (s) { ctx.fillRect(s.x, s.y, s.r, s.r); });
    state.asteroids.forEach(function (a) {
      ctx.strokeStyle = '#c9d4ea'; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i <= a.verts.length; i++) {
        var ang = a.rot + (i % a.verts.length) / a.verts.length * Math.PI * 2;
        var r = a.verts[i % a.verts.length];
        var x = a.x + Math.cos(ang) * r, y = a.y + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    });
    ctx.fillStyle = '#ffd166';
    state.bullets.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); });
    var ship = state.ship;
    if (state.status !== 'over' && !(ship.invuln > 0 && Math.floor(performance.now() / 150) % 2 === 0)) {
      ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle);
      ctx.strokeStyle = '#7ef0c1'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10);
      ctx.closePath(); ctx.stroke();
      if (ship.thrusting) {
        ctx.strokeStyle = '#ff8c42'; ctx.beginPath();
        ctx.moveTo(-5, 0); ctx.lineTo(-18, 0); ctx.stroke();
      }
      ctx.restore();
    }
    if (flashMsg && performance.now() < flashUntil) {
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center'; ctx.fillText(flashMsg, L.W / 2, 60);
      ctx.textAlign = 'left';
    }
  }

  function setOverlay(kind) {
    var ov = el('overlay'), msg = el('overlayMsg');
    if (kind === 'ready') { ov.classList.remove('hidden'); msg.textContent = t('tag'); }
    else if (kind === 'paused') { ov.classList.remove('hidden'); msg.textContent = t('paused'); }
    else if (kind === 'over') {
      ov.classList.remove('hidden');
      var isBest = state.score > 0 && state.score >= best;
      msg.textContent = t('gameOver') + ' \u2014 ' + t('finalScore') + ': ' + digits(state.score, lang) +
        (isBest ? ' ' + t('newBest') : '');
    } else ov.classList.add('hidden');
    renderText();
  }

  function startGame() {
    state = L.createGame((Date.now() % 100000) + 1);
    state.status = 'playing';
    running = true; lastT = performance.now();
    setOverlay('none'); renderHud();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    if (state.score > best) {
      best = state.score;
      localStorage.setItem('asteroids-bd-best', String(best));
    }
    renderHud(); setOverlay('over');
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
    var events = L.step(state, input, dt);
    events.forEach(function (e) {
      if (e.type === 'fire') beep(880, 0.08, 'square');
      if (e.type === 'split') beep(160, 0.15, 'sawtooth');
      if (e.type === 'ship-down') beep(90, 0.4, 'sawtooth');
      if (e.type === 'extra-life') { flashMsg = '+1 ' + t('lives'); flashUntil = performance.now() + 1500; }
      if (e.type === 'level-clear') { flashMsg = t('levelClear') + digits(e.level, lang); flashUntil = performance.now() + 2000; }
    });
    if (state.status === 'over') { gameOver(); return; }
    renderHud(); draw();
    raf = requestAnimationFrame(loop);
  }

  function hyperspace() {
    if (state.status !== 'playing') return;
    var tries = 0, x, y, ok;
    do {
      x = Math.random() * L.W; y = Math.random() * L.H; tries++;
      ok = state.asteroids.every(function (a) { return Math.hypot(a.x - x, a.y - y) > a.r + 80; });
    } while (!ok && tries < 50);
    state.ship.x = x; state.ship.y = y;
    state.ship.vx = 0; state.ship.vy = 0; state.ship.invuln = 2;
    beep(1200, 0.2, 'sine'); draw();
  }

  var KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
               ArrowUp: 'thrust', w: 'thrust', W: 'thrust', ' ': 'fire' };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (e.key === 'h' || e.key === 'H') { hyperspace(); return; }
    var k = KEYS[e.key];
    if (k) { input[k] = true; if (e.key === ' ') e.preventDefault(); }
  });
  document.addEventListener('keyup', function (e) {
    var k = KEYS[e.key]; if (k) input[k] = false;
  });

  function bindHold(id, key) {
    var b = el(id);
    var on = function (e) { e.preventDefault(); input[key] = true; };
    var off = function (e) { e.preventDefault(); input[key] = false; };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
  }
  bindHold('btnLeft', 'left'); bindHold('btnRight', 'right');
  bindHold('btnThrust', 'thrust'); bindHold('btnFire', 'fire');

  function togglePause() {
    if (state.status !== 'playing') return;
    running = !running;
    if (running) { lastT = performance.now(); raf = requestAnimationFrame(loop); setOverlay('none'); }
    else { cancelAnimationFrame(raf); setOverlay('paused'); }
    renderText();
  }

  el('startBtn').addEventListener('click', startGame);
  el('pauseBtn').addEventListener('click', togglePause);
  el('jumpBtn').addEventListener('click', hyperspace);
  el('newBtn').addEventListener('click', startGame);
  el('soundBtn').addEventListener('click', function () {
    soundOn = !soundOn;
    localStorage.setItem('asteroids-bd-sound', soundOn ? 'on' : 'off');
    renderText();
  });
  el('langBtn').addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    localStorage.setItem('asteroids-bd-lang', lang);
    renderText(); renderHud(); draw();
  });

  window.__asteroids = { getState: function () { return state; }, start: startGame,
    jump: hyperspace, setLang: function (l) { lang = l; renderText(); renderHud(); } };
  renderText(); renderHud(); draw(); setOverlay('ready');
})();
