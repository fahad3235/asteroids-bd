/* Headless-Chrome smoke test for asteroids-bd via raw CDP.
 * Run: node tests/smoke.mjs */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const PORT = 9338;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + path.resolve(DIR, '..', 'index.html');

let n = 0, failures = [];
function check(name, cond, extra = '') {
  n++;
  if (cond) console.log('ok ' + n + ' - ' + name);
  else { console.log('FAIL ' + n + ' - ' + name + ' ' + extra); failures.push(name); }
}

const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/asteroids-smoke-profile', 'about:blank'],
  { stdio: 'ignore' });

async function waitForList() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/list'); if (r.ok) return; } catch (e) {}
    await sleep(500);
  }
  throw new Error('chrome debug port never came up');
}

let ws, msgId = 0;
const pending = new Map();
const consoleErrors = [], pageExceptions = [];
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function evalJs(expression) {
  return send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    .then((m) => m.result.result);
}

try {
  await waitForList();
  const tabs = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?' + encodeURIComponent(URL), { method: 'PUT' })).json();
  ws = new WebSocket(tabs.webSocketDebuggerUrl);
  await new Promise((res) => { ws.onopen = res; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      consoleErrors.push(JSON.stringify(m.params.args));
    if (m.method === 'Runtime.exceptionThrown') pageExceptions.push(m.params.exceptionDetails.exception?.description || 'exception');
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await sleep(1200);
  await evalJs(`localStorage.clear()`);
  await send('Page.reload', { ignoreCache: true });
  await sleep(1200);

  const r = await evalJs(`(() => {
    const out = {};
    const $ = (id) => document.getElementById(id);
    out.title = $('title').textContent;
    out.canvas = !!$('game') && $('game').width === 720 && $('game').height === 480;
    out.overlayReady = !$('overlay').classList.contains('hidden');
    out.hudBefore = $('hudScore').textContent;
    // Start the game
    $('startBtn').click();
    out.overlayHidden = $('overlay').classList.contains('hidden');
    out.status = window.__asteroids.getState().status;
    out.asteroids = window.__asteroids.getState().asteroids.length;
    out.shipBefore = [window.__asteroids.getState().ship.x, window.__asteroids.getState().ship.y];
    // Hyperspace jump must move the ship and grant invulnerability
    $('jumpBtn').click();
    const st = window.__asteroids.getState();
    out.shipAfter = [st.ship.x, st.ship.y];
    out.invuln = st.ship.invuln;
    // Pause then resume
    $('pauseBtn').click();
    out.pausedOverlay = !$('overlay').classList.contains('hidden');
    out.pausedMsg = $('overlayMsg').textContent;
    $('pauseBtn').click();
    out.resumedOverlay = $('overlay').classList.contains('hidden');
    // Bengali toggle: title changes, HUD digits become Bengali
    $('langBtn').click();
    out.bnTitle = $('title').textContent;
    out.bnHud = $('hudScore').textContent;
    out.bnLang = document.documentElement.lang;
    return out;
  })()`);
  if (r.subtype === 'error') throw new Error('page eval error: ' + r.description);
  const o = r.value;
  check('EN title renders', o.title === 'Asteroids BD', 'got ' + o.title);
  check('canvas 720x480 present', o.canvas === true);
  check('ready overlay visible before start', o.overlayReady === true);
  check('start hides overlay, status playing', o.overlayHidden === true && o.status === 'playing', JSON.stringify(o));
  check('level 1 field has 4 asteroids', o.asteroids === 4, 'got ' + o.asteroids);
  check('hyperspace moves ship + grants invulnerability', (o.shipBefore[0] !== o.shipAfter[0] || o.shipBefore[1] !== o.shipAfter[1]) && o.invuln > 0, JSON.stringify(o));
  check('pause shows overlay, resume hides it', o.pausedOverlay === true && o.resumedOverlay === true, JSON.stringify(o));
  check('pause message reads Paused', o.pausedMsg === 'Paused', 'got ' + o.pausedMsg);
  check('BN toggle changes title', o.bnTitle && o.bnTitle !== 'Asteroids BD', 'got ' + o.bnTitle);
  check('BN HUD uses Bengali digits (score 0)', o.bnHud.includes('০'), 'got ' + o.bnHud);
  check('document lang switches to bn', o.bnLang === 'bn', 'got ' + o.bnLang);

  // Lang persists across reload (still Bengali)
  await send('Page.reload', { ignoreCache: true });
  await sleep(1200);
  const r2 = await evalJs(`document.getElementById('title').textContent`);
  check('Bengali title survives reload', r2.value && r2.value !== 'Asteroids BD', 'got ' + r2.value);

  // 390px mobile: no horizontal overflow
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(500);
  const r3 = await evalJs(`Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)`);
  check('390px viewport: no horizontal overflow', r3.value <= 390, 'scrollWidth=' + r3.value);

  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('zero page exceptions', pageExceptions.length === 0, pageExceptions.join(' | '));
} catch (e) {
  console.log('SMOKE ERROR: ' + e.message);
  failures.push('harness: ' + e.message);
} finally {
  try { ws?.close(); } catch (e) {}
  chrome.kill('SIGKILL');
}
console.log(failures.length === 0 ? 'ALL ' + n + ' SMOKE CHECKS PASSED' : failures.length + ' SMOKE FAILURES');
process.exit(failures.length === 0 ? 0 : 1);
