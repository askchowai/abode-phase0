/* C.H.O.W. Speed — the client.
   Fixed-step simulation with an interpolated draw, so the game feels the same on
   a 60Hz phone and a 120Hz laptop. Everything here is presentation and input; the
   rules live in physics.js. */

(function () {
  'use strict';

  const S = window.SPEED;
  const A = S.ARENA;
  const RL = S.RL;
  /* RL's frame has the origin at the centre spot and +Y up the pitch; the canvas
     has it top-left and +Y down. One transform, applied once, keeps the rest of
     this file speaking Rocket League. */
  const W = A.x * 2, H = (A.y + A.goalDepth) * 2;
  const toX = (x) => x + A.x;
  const toY = (y) => (A.y + A.goalDepth) - y;

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

  let viewScale = 1;
  function fit() {
    if (!ctx) return;
    const box = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const scale = Math.min(box.width / W, box.height / H);
    viewScale = scale;
    canvas.style.width = Math.round(W * scale) + 'px';
    canvas.style.height = Math.round(H * scale) + 'px';
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }
  window.addEventListener('resize', fit);

  /* ---------- input ---------- */

  const KEY_MAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'boost', ShiftRight: 'boost', KeyJ: 'boost',
    Space: 'jump', KeyK: 'jump',
    KeyL: 'handbrake', AltLeft: 'handbrake',
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
    const px = (ev.clientX - box.left) / box.width * W;
    const py = (ev.clientY - box.top) / box.height * H;
    return { x: px - A.x, y: (A.y + A.goalDepth) - py };   /* back into RL's frame */
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
  let touchBoost = false, touchJump = false, touchDrift = false;
  const hold = (el, set) => {
    ['touchstart', 'mousedown'].forEach((e) => el.addEventListener(e, (ev) => { ev.preventDefault(); set(true); }, { passive: false }));
    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach((e) => el.addEventListener(e, () => set(false)));
  };
  const btnDrift = document.getElementById('btn-drift');
  hold(btnBoost, (v) => { touchBoost = v; });
  hold(btnFlip, (v) => { touchJump = v; });
  if (btnDrift) hold(btnDrift, (v) => { touchDrift = v; });

  function readInput() {
    const car = world.cars[0];
    input.throttle = 0; input.steer = 0; input.boost = false; input.jump = false; input.handbrake = false;

    if (keys.up) input.throttle += 1;
    if (keys.down) input.throttle -= 1;
    if (keys.left) input.steer -= 1;
    if (keys.right) input.steer += 1;
    if (keys.boost) input.boost = true;
    if (keys.handbrake) input.handbrake = true;
    if (keys.jump) { input.jump = true; keys.jump = false; }

    if (pointer) {
      const dx = pointer.x - car.x, dy = pointer.y - car.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let diff = Math.atan2(dy, dx) - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      input.steer = Math.max(-1, Math.min(1, diff * 2.4));
      /* reverse out if the target is behind you and close */
      input.throttle = (Math.abs(diff) > 2.3 && dist < 1200) ? -1 : (dist > 120 ? 1 : 0);
    }

    if (touchBoost) input.boost = true;
    if (touchDrift) input.handbrake = true;
    if (touchJump) { input.jump = true; touchJump = false; }
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
    ev.demos.forEach((d) => {
      shake = 18;
      chord(d.by === 0);
      banner(d.by === 0 ? 'Demolished them' : 'You were demolished',
        d.by === 0 ? 'Three seconds without a rival.' : 'Back in three seconds.', null);
      setTimeout(hideBanner, 900);
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
    ctx.clearRect(0, 0, W, H);
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
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, css('--field-1'));
    g.addColorStop(1, css('--field-2'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* the pitch proper, with the nets drawn outside it */
    ctx.strokeStyle = css('--line');
    ctx.lineWidth = 14;
    ctx.strokeRect(toX(-A.x), toY(A.y), A.x * 2, A.y * 2);

    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(toX(-A.x), toY(0)); ctx.lineTo(toX(A.x), toY(0));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(toX(0), toY(0), 900, 0, Math.PI * 2);
    ctx.stroke();

    /* the corners of a Rocket League pitch are cut; suggest that with arcs */
    ctx.globalAlpha = 0.5;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(toX(sx * A.x), toY(sy * A.y), 1150, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    [0, 1].forEach((team) => {
      const y = team === 0 ? -A.y : A.y;          /* team 0 defends the bottom */
      const dir = team === 0 ? -1 : 1;
      const colour = team === 0 ? css('--us') : css('--them');
      ctx.fillStyle = team === 0 ? css('--us-wash') : css('--them-wash');
      ctx.beginPath();
      ctx.rect(toX(-A.goalHalf), toY(y + dir * A.goalDepth), A.goalHalf * 2, A.goalDepth);
      ctx.fill();
      ctx.strokeStyle = colour;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(toX(-A.goalHalf), toY(y));
      ctx.lineTo(toX(-A.goalHalf), toY(y + dir * A.goalDepth));
      ctx.lineTo(toX(A.goalHalf), toY(y + dir * A.goalDepth));
      ctx.lineTo(toX(A.goalHalf), toY(y));
      ctx.stroke();
    });
  }

  function pad(p) {
    const r = p.big ? 100 : 62;
    ctx.globalAlpha = p.live ? 1 : 0.16;
    ctx.fillStyle = p.big ? css('--boost') : css('--boost-dim');
    ctx.beginPath();
    ctx.arc(toX(p.x), toY(p.y), r, 0, Math.PI * 2);
    ctx.fill();
    if (p.live && p.big) {
      ctx.strokeStyle = css('--boost');
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), r + 60 + Math.sin(world.t * 4) * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function trailPush(ball) {
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 20) trail.shift();
  }
  function drawTrail() {
    const heat = world.mode === 'heatseeker';
    trail.forEach((p, i) => {
      ctx.globalAlpha = (i / trail.length) * (heat ? 0.4 : 0.2);
      ctx.fillStyle = heat ? css('--them') : css('--ball');
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), world.ball.r * (0.3 + 0.7 * (i / trail.length)), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawBall(b) {
    const heat = world.mode === 'heatseeker';
    ctx.save();
    ctx.shadowColor = heat ? css('--them') : css('--ball');
    ctx.shadowBlur = 60;
    ctx.fillStyle = heat ? css('--them') : css('--ball');
    ctx.beginPath();
    ctx.arc(toX(b.x), toY(b.y), world.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(6,13,26,.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(toX(b.x), toY(b.y), world.ball.r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  }

  function car(view, real, i) {
    if (real.demoTimer > 0) return;
    const colour = i === 0 ? css('--us') : css('--them');
    const L = RL.HITBOX_LENGTH, B = RL.HITBOX_WIDTH;
    ctx.save();
    ctx.translate(toX(view.x), toY(view.y));
    ctx.rotate(-view.angle);                    /* screen y is flipped */

    const speed = Math.hypot(real.vx, real.vy);
    if (speed > 200) {
      ctx.globalAlpha = Math.min(0.55, speed / RL.CAR_MAX_SPEED * 0.6);
      ctx.fillStyle = real.supersonic ? css('--boost') : colour;
      ctx.beginPath();
      ctx.ellipse(-L * 0.9, 0, L * 0.8, B * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = real.supersonic ? 40 : 18;
    roundRect(-L / 2, -B / 2, L, B, 18);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(6,13,26,.85)';
    roundRect(-L * 0.1, -B * 0.34, L * 0.36, B * 0.68, 10);
    ctx.fill();
    ctx.restore();
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
    const me = world.cars[0];
    const status = document.getElementById('status');
    if (status) {
      status.textContent = me.demoTimer > 0 ? `Demolished ${me.demoTimer.toFixed(1)}s`
        : me.supersonic ? 'Supersonic' : world.kickoff > 0 ? 'Kickoff' : '—';
      status.style.color = me.demoTimer > 0 ? css('--them') : me.supersonic ? css('--boost') : '';
    }
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
  const modeSel = document.getElementById('mode');
  const newGame = () => {
    world = S.create({ mode: modeSel ? modeSel.value : 'soccar' });
    trail.length = 0;
    snapshot();
    running = true;
    hideBanner();
    fit();
  };
  document.getElementById('btn-restart').addEventListener('click', newGame);
  if (modeSel) modeSel.addEventListener('change', () => {
    newGame();
    toastMode(world.modeName);
  });
  function toastMode(name) {
    banner(name, name === 'Heatseeker' ? 'The ball hunts a goal and gains speed with every touch.'
      : name === 'Snow day' ? 'A heavy puck that slides forever.'
      : 'Rocket League proportions, flat.', 'Kick off');
    running = false;
  }

  fit();
  snapshot();
  banner('C.H.O.W. Speed', 'Hold anywhere to drive. Boost with the button, flip to hit harder.', 'Kick off');
  requestAnimationFrame(frame);

  window.CHOWSPEED = { get world() { return world; }, start, togglePause };
})();
