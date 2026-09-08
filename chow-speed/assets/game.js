/* C.H.O.W. Speed — the client.
   Fixed-step simulation with an interpolated draw, so the game feels the same on
   a 60Hz phone and a 120Hz laptop. Everything here is presentation and input; the
   rules live in physics.js. */

(function () {
  'use strict';

  const S = window.SPEED;
  const A = S.ARENA;

  const canvas = document.getElementById('field');
  /* Somewhere without a canvas — a headless test, a locked-down browser — should
     still run the game and keep its numbers honest, just without pictures. */
  let ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
  const hud = {
    us: document.getElementById('score-us'),
    them: document.getElementById('score-them'),
    clock: document.getElementById('clock'),
    boost: document.getElementById('boost-fill'),
    boostN: document.getElementById('boost-n'),
    banner: document.getElementById('banner'),
    bannerText: document.getElementById('banner-text'),
    bannerSub: document.getElementById('banner-sub'),
    bannerBtn: document.getElementById('banner-btn'),
    speed: document.getElementById('speedo'),
  };

  let world = S.create();
  let running = false;
  let acc = 0, last = 0;
  const prev = { ball: null, cars: [] };
  const input = S.blankInput();
  const keys = Object.create(null);
  let pointer = null;               /* where a finger or mouse is asking us to go */
  let shake = 0;
  const trail = [];

  /* ---------- sizing ---------- */

  function fit() {
    if (!ctx) return;
    const box = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const scale = Math.min(box.width / A.w, box.height / A.h);
    canvas.style.width = Math.round(A.w * scale) + 'px';
    canvas.style.height = Math.round(A.h * scale) + 'px';
    canvas.width = Math.round(A.w * scale * dpr);
    canvas.height = Math.round(A.h * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }
  window.addEventListener('resize', fit);

  /* ---------- input ---------- */

  const KEY_MAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'boost', ShiftRight: 'boost', KeyJ: 'boost',
    Space: 'flip', KeyK: 'flip',
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
    if (e.code === 'Enter' && !running) { start(); return; }
    const k = KEY_MAP[e.code];
    if (!k) return;
    e.preventDefault();
    keys[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = KEY_MAP[e.code];
    if (k) keys[k] = false;
  });

  function canvasPoint(ev) {
    const box = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - box.left) / box.width * A.w,
      y: (ev.clientY - box.top) / box.height * A.h,
    };
  }

  /* Touch: hold anywhere on the field to drive at that point. It is the only
     control scheme that works one-handed on a phone. */
  const holdArea = document.getElementById('stage');
  const onDown = (ev) => {
    if (ev.target.closest('button')) return;
    const t = ev.touches ? ev.touches[0] : ev;
    pointer = canvasPoint(t);
    if (ev.cancelable) ev.preventDefault();
  };
  const onMove = (ev) => {
    if (!pointer) return;
    const t = ev.touches ? ev.touches[0] : ev;
    pointer = canvasPoint(t);
    if (ev.cancelable) ev.preventDefault();
  };
  const onUp = () => { pointer = null; };
  holdArea.addEventListener('touchstart', onDown, { passive: false });
  holdArea.addEventListener('touchmove', onMove, { passive: false });
  holdArea.addEventListener('touchend', onUp);
  holdArea.addEventListener('touchcancel', onUp);
  holdArea.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  const btnBoost = document.getElementById('btn-boost');
  const btnFlip = document.getElementById('btn-flip');
  let touchBoost = false, touchFlip = false;
  const hold = (el, set) => {
    ['touchstart', 'mousedown'].forEach((e) => el.addEventListener(e, (ev) => { ev.preventDefault(); set(true); }, { passive: false }));
    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach((e) => el.addEventListener(e, () => set(false)));
  };
  hold(btnBoost, (v) => { touchBoost = v; });
  hold(btnFlip, (v) => { touchFlip = v; });

  function readInput() {
    const car = world.cars[0];
    input.throttle = 0; input.steer = 0; input.boost = false; input.flip = false;

    if (keys.up) input.throttle += 1;
    if (keys.down) input.throttle -= 1;
    if (keys.left) input.steer -= 1;
    if (keys.right) input.steer += 1;
    if (keys.boost) input.boost = true;
    if (keys.flip) { input.flip = true; keys.flip = false; }

    if (pointer) {
      const dx = pointer.x - car.x, dy = pointer.y - car.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let diff = Math.atan2(dy, dx) - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      input.steer = Math.max(-1, Math.min(1, diff * 2.4));
      /* reverse out if the target is behind you and close */
      input.throttle = (Math.abs(diff) > 2.3 && dist < 220) ? -1 : (dist > 26 ? 1 : 0);
    }

    if (touchBoost) input.boost = true;
    if (touchFlip) { input.flip = true; touchFlip = false; }
    return input;
  }

  /* ---------- loop ---------- */

  function snapshot() {
    prev.ball = { x: world.ball.x, y: world.ball.y };
    prev.cars = world.cars.map((c) => ({ x: c.x, y: c.y, angle: c.angle }));
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;            /* a backgrounded tab does not fast-forward */

    if (running) {
      acc += dt;
      while (acc >= S.TICK) {
        snapshot();
        const ev = S.step(world, [readInput(), S.botInput(world, 1)], S.TICK);
        onEvents(ev);
        acc -= S.TICK;
      }
    }
    draw(running ? acc / S.TICK : 1);
    updateHud();
  }

  function onEvents(ev) {
    ev.touches.forEach((t) => {
      if (t.power > 260) { shake = Math.min(14, shake + t.power / 90); beep(t.power); }
    });
    if (ev.goal !== null) {
      shake = 16;
      banner(ev.goal === 0 ? 'Goal' : 'Conceded',
        ev.goal === 0 ? 'That is one for you.' : 'They got one back.', null);
      setTimeout(() => { if (!world.over) hideBanner(); }, 1400);
      chord(ev.goal === 0);
    }
    if (world.over) {
      running = false;
      const [us, them] = world.score;
      banner(us > them ? 'You win' : us === them ? 'Draw' : 'You lose',
        `${us} – ${them} at full time.`, 'Play again');
    }
  }

  /* ---------- sound: three oscillators, no files ---------- */

  let audio = null;
  const ac = () => {
    if (audio === null && (window.AudioContext || window.webkitAudioContext)) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audio;
  };
  function tone(freq, dur, type, gain) {
    const a = ac();
    if (!a || a.state === 'suspended') return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.value = gain === undefined ? 0.05 : gain;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  }
  const beep = (power) => tone(120 + Math.min(280, power / 3), 0.09, 'square', 0.035);
  const chord = (good) => {
    [0, 90, 180].forEach((ms, i) => setTimeout(() =>
      tone(good ? [392, 523, 659][i] : [330, 262, 196][i], 0.22, 'triangle', 0.05), ms));
  };

  /* ---------- drawing ---------- */

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#00d4ff';

  function draw(alpha) {
    if (!ctx) return;
    const ball = lerp(prev.ball, world.ball, alpha);
    ctx.save();
    if (shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake *= 0.86;
    }
    ctx.clearRect(-20, -20, A.w + 40, A.h + 40);

    field();
    world.pads.forEach(pad);
    trailPush(ball);
    drawTrail();
    world.cars.forEach((c, i) => car(lerp(prev.cars[i], c, alpha), c, i));
    drawBall(ball);
    ctx.restore();
  }

  function lerp(a, b, t) {
    if (!a) return b;
    const angle = b.angle === undefined ? undefined : a.angle + shortest(b.angle - a.angle) * t;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle };
  }
  function shortest(d) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function field() {
    const g = ctx.createLinearGradient(0, 0, A.w, A.h);
    g.addColorStop(0, css('--field-1'));
    g.addColorStop(1, css('--field-2'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, A.w, A.h);

    ctx.strokeStyle = css('--line');
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, A.w - 2, A.h - 2);
    ctx.beginPath();
    ctx.moveTo(A.w / 2, 0); ctx.lineTo(A.w / 2, A.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(A.w / 2, A.h / 2, 110, 0, Math.PI * 2);
    ctx.stroke();

    [0, 1].forEach((side) => {
      const x = side ? A.w : 0;
      const dir = side ? 1 : -1;
      ctx.fillStyle = side ? css('--them-wash') : css('--us-wash');
      ctx.fillRect(side ? A.w - 120 : 0, A.h / 2 - A.goalW / 2, 120, A.goalW);
      ctx.strokeStyle = side ? css('--them') : css('--us');
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, A.h / 2 - A.goalW / 2);
      ctx.lineTo(x + dir * A.goalDepth * 0.6, A.h / 2 - A.goalW / 2);
      ctx.lineTo(x + dir * A.goalDepth * 0.6, A.h / 2 + A.goalW / 2);
      ctx.lineTo(x, A.h / 2 + A.goalW / 2);
      ctx.stroke();
    });
  }

  function pad(p) {
    ctx.globalAlpha = p.live ? 1 : 0.18;
    ctx.fillStyle = p.big ? css('--boost') : css('--boost-dim');
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.big ? 15 : 9, 0, Math.PI * 2);
    ctx.fill();
    if (p.live && p.big) {
      ctx.strokeStyle = css('--boost');
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24 + Math.sin(world.t * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function trailPush(ball) {
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 22) trail.shift();
  }
  function drawTrail() {
    trail.forEach((p, i) => {
      ctx.globalAlpha = (i / trail.length) * 0.25;
      ctx.fillStyle = css('--ball');
      ctx.beginPath();
      ctx.arc(p.x, p.y, S.BALL.r * (0.3 + 0.7 * (i / trail.length)), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawBall(b) {
    ctx.save();
    ctx.shadowColor = css('--ball');
    ctx.shadowBlur = 24;
    ctx.fillStyle = css('--ball');
    ctx.beginPath();
    ctx.arc(b.x, b.y, S.BALL.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, S.BALL.r - 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  function car(view, real, i) {
    const colour = i === 0 ? css('--us') : css('--them');
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.rotate(view.angle);

    const speed = Math.hypot(real.vx, real.vy);
    if (speed > 60) {
      ctx.globalAlpha = Math.min(0.5, speed / 2200);
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.ellipse(-26, 0, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = 14;
    roundRect(-22, -13, 44, 26, 7);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(6,13,26,.85)';
    roundRect(-4, -9, 16, 18, 4);
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- hud ---------- */

  function updateHud() {
    hud.us.textContent = world.score[0];
    hud.them.textContent = world.score[1];
    const s = Math.ceil(world.clock);
    hud.clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const b = Math.round(world.cars[0].boost);
    hud.boost.style.width = b + '%';
    hud.boostN.textContent = b;
    hud.speed.textContent = Math.round(Math.hypot(world.cars[0].vx, world.cars[0].vy));
  }

  function banner(title, sub, button) {
    hud.bannerText.textContent = title;
    hud.bannerSub.textContent = sub;
    hud.bannerBtn.hidden = !button;
    if (button) hud.bannerBtn.textContent = button;
    hud.banner.hidden = false;
  }
  function hideBanner() { hud.banner.hidden = true; }

  function start() {
    if (world.over) world = S.create();
    hideBanner();
    running = true;
    last = 0; acc = 0;
    const a = ac();
    if (a && a.state === 'suspended') a.resume();
  }

  function togglePause() {
    if (world.over) return;
    running = !running;
    if (running) { hideBanner(); last = 0; }
    else banner('Paused', 'Take your time.', 'Resume');
  }

  hud.bannerBtn.addEventListener('click', () => (world.over || !running ? start() : null));
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-restart').addEventListener('click', () => {
    world = S.create();
    running = true;
    hideBanner();
  });

  fit();
  snapshot();
  banner('C.H.O.W. Speed', 'Hold anywhere to drive. Boost with the button, flip to hit harder.', 'Kick off');
  requestAnimationFrame(frame);

  window.CHOWSPEED = { get world() { return world; }, start, togglePause };
})();
