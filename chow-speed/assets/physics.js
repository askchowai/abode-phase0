/* C.H.O.W. Speed — the simulation.
   Deliberately separate from anything that draws: this file knows about mass,
   friction and walls, and nothing about canvases or fingers. That means the whole
   game can be stepped in a test without a browser, which is the one lesson worth
   stealing from RocketSim — the physics is a library, the game is a client. */

(function (root) {
  'use strict';

  const ARENA = { w: 1200, h: 760, wall: 0, goalW: 230, goalDepth: 60 };
  const TICK = 1 / 120;                    /* fixed step; the renderer interpolates */

  const CAR = {
    r: 21,
    accel: 1150,                           /* units per second per second */
    reverse: 700,
    boostAccel: 1750,
    boostDrain: 33,                        /* boost units per second */
    boostMax: 100,
    turn: 3.1,                             /* radians per second at speed */
    grip: 7.2,                             /* how hard sideways slip is killed */
    drag: 0.55,
    maxSpeed: 1000,
    boostMaxSpeed: 1410,
    flipImpulse: 900,
    flipCooldown: 1.2,
    mass: 1,
  };

  const BALL = {
    r: 33,
    drag: 0.32,
    restitution: 0.62,
    mass: 0.55,
    maxSpeed: 2100,
  };

  const PADS = [
    { x: 300, y: 190, big: false }, { x: 300, y: 570, big: false },
    { x: 900, y: 190, big: false }, { x: 900, y: 570, big: false },
    { x: 600, y: 120, big: false }, { x: 600, y: 640, big: false },
    { x: 90, y: 380, big: true }, { x: 1110, y: 380, big: true },
  ];
  const PAD_RESPAWN = { big: 10, small: 4 };

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const len = (x, y) => Math.sqrt(x * x + y * y);

  function createCar(x, y, angle, team) {
    return { x, y, vx: 0, vy: 0, angle, boost: 34, team, flipTimer: 0, r: CAR.r, spin: 0 };
  }

  function create(opts) {
    const o = opts || {};
    return {
      t: 0,
      arena: ARENA,
      ball: { x: ARENA.w / 2, y: ARENA.h / 2, vx: 0, vy: 0, r: BALL.r },
      cars: [createCar(ARENA.w * 0.25, ARENA.h / 2, 0, 0), createCar(ARENA.w * 0.75, ARENA.h / 2, Math.PI, 1)],
      pads: PADS.map((p) => Object.assign({}, p, { live: true, timer: 0 })),
      score: [0, 0],
      clock: o.clock === undefined ? 180 : o.clock,
      lastGoal: null,
      kickoff: 0,
      over: false,
    };
  }

  /* an input is four numbers and two flags, the same shape a bot would send */
  const blankInput = () => ({ throttle: 0, steer: 0, boost: false, flip: false });

  function stepCar(car, input, dt) {
    const speed = len(car.vx, car.vy);
    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
    const forward = car.vx * fx + car.vy * fy;

    /* steering has no effect on a car that is not moving, as in the real thing */
    const steerAuthority = clamp(speed / 260, 0, 1);
    car.angle += input.steer * CAR.turn * steerAuthority * dt * (forward < -20 ? -1 : 1);

    let ax = 0, ay = 0;
    if (input.throttle > 0) { ax += fx * CAR.accel * input.throttle; ay += fy * CAR.accel * input.throttle; }
    else if (input.throttle < 0) { ax += fx * CAR.reverse * input.throttle; ay += fy * CAR.reverse * input.throttle; }

    let boosting = false;
    if (input.boost && car.boost > 0) {
      boosting = true;
      car.boost = Math.max(0, car.boost - CAR.boostDrain * dt);
      ax += fx * CAR.boostAccel;
      ay += fy * CAR.boostAccel;
    }

    if (input.flip && car.flipTimer <= 0) {
      car.flipTimer = CAR.flipCooldown;
      car.vx += fx * CAR.flipImpulse;
      car.vy += fy * CAR.flipImpulse;
    }
    car.flipTimer = Math.max(0, car.flipTimer - dt);

    car.vx += ax * dt;
    car.vy += ay * dt;

    /* kill sideways velocity — this is what makes it feel like a car and not a puck */
    const sx = -fy, sy = fx;
    const side = car.vx * sx + car.vy * sy;
    const killed = side * Math.min(1, CAR.grip * dt);
    car.vx -= sx * killed;
    car.vy -= sy * killed;

    if (!input.throttle && !boosting) {
      const d = Math.max(0, 1 - CAR.drag * dt);
      car.vx *= d; car.vy *= d;
    }

    const cap = boosting ? CAR.boostMaxSpeed : CAR.maxSpeed;
    const sp = len(car.vx, car.vy);
    if (sp > cap) { car.vx = car.vx / sp * cap; car.vy = car.vy / sp * cap; }

    car.x += car.vx * dt;
    car.y += car.vy * dt;
    return boosting;
  }

  function inGoalMouth(y) {
    return Math.abs(y - ARENA.h / 2) < ARENA.goalW / 2;
  }

  function bounceWalls(body, restitution, isBall) {
    let hit = false;
    if (body.x - body.r < 0) {
      if (isBall && inGoalMouth(body.y) && body.x > -ARENA.goalDepth) { /* let it into the net */ }
      else { body.x = body.r; body.vx = -body.vx * restitution; hit = true; }
    }
    if (body.x + body.r > ARENA.w) {
      if (isBall && inGoalMouth(body.y) && body.x < ARENA.w + ARENA.goalDepth) { /* into the net */ }
      else { body.x = ARENA.w - body.r; body.vx = -body.vx * restitution; hit = true; }
    }
    if (body.y - body.r < 0) { body.y = body.r; body.vy = -body.vy * restitution; hit = true; }
    if (body.y + body.r > ARENA.h) { body.y = ARENA.h - body.r; body.vy = -body.vy * restitution; hit = true; }
    return hit;
  }

  /* an elastic-ish impulse between two circles, with the car treated as heavier */
  function collide(car, ball) {
    const dx = ball.x - car.x, dy = ball.y - car.y;
    const d = len(dx, dy);
    const min = car.r + ball.r;
    if (d >= min || d === 0) return 0;

    const nx = dx / d, ny = dy / d;
    const overlap = min - d;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const rvx = ball.vx - car.vx, rvy = ball.vy - car.vy;
    const along = rvx * nx + rvy * ny;
    if (along > 0) return 0;

    const e = 0.72;
    const invBall = 1 / BALL.mass, invCar = 1 / CAR.mass;
    const j = -(1 + e) * along / (invBall + invCar * 0.25);
    ball.vx += nx * j * invBall;
    ball.vy += ny * j * invBall;
    car.vx -= nx * j * invCar * 0.25;
    car.vy -= ny * j * invCar * 0.25;

    /* the nose of the car adds a shove, which is what makes a good touch */
    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
    const noseAlign = Math.max(0, fx * nx + fy * ny);
    const carSpeed = len(car.vx, car.vy);
    ball.vx += fx * noseAlign * carSpeed * 0.35;
    ball.vy += fy * noseAlign * carSpeed * 0.35;
    return Math.abs(j);
  }

  function stepBall(ball, dt) {
    const d = Math.max(0, 1 - BALL.drag * dt);
    ball.vx *= d; ball.vy *= d;
    const sp = len(ball.vx, ball.vy);
    if (sp > BALL.maxSpeed) { ball.vx = ball.vx / sp * BALL.maxSpeed; ball.vy = ball.vy / sp * BALL.maxSpeed; }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  }

  function pads(world, dt) {
    world.pads.forEach((pad) => {
      if (!pad.live) {
        pad.timer -= dt;
        if (pad.timer <= 0) { pad.live = true; }
        return;
      }
      world.cars.forEach((car) => {
        if (!pad.live) return;
        if (len(car.x - pad.x, car.y - pad.y) < car.r + 22) {
          car.boost = Math.min(CAR.boostMax, car.boost + (pad.big ? 100 : 12));
          pad.live = false;
          pad.timer = pad.big ? PAD_RESPAWN.big : PAD_RESPAWN.small;
        }
      });
    });
  }

  function kickoff(world, conceded) {
    world.ball.x = ARENA.w / 2; world.ball.y = ARENA.h / 2;
    world.ball.vx = 0; world.ball.vy = 0;
    world.cars[0].x = ARENA.w * 0.25; world.cars[0].y = ARENA.h / 2;
    world.cars[0].vx = 0; world.cars[0].vy = 0; world.cars[0].angle = 0;
    world.cars[1].x = ARENA.w * 0.75; world.cars[1].y = ARENA.h / 2;
    world.cars[1].vx = 0; world.cars[1].vy = 0; world.cars[1].angle = Math.PI;
    world.cars.forEach((c) => { c.boost = 34; });
    world.pads.forEach((p) => { p.live = true; p.timer = 0; });
    world.kickoff = 1.2;
    world.lastGoal = conceded === undefined ? null : conceded;
  }

  /* one fixed tick. inputs is [carInput, carInput]; events come back out */
  function step(world, inputs, dt) {
    const events = { goal: null, touches: [], boosting: [false, false] };
    if (world.over) return events;
    const h = dt === undefined ? TICK : dt;

    world.t += h;
    if (world.clock > 0) {
      world.clock = Math.max(0, world.clock - h);
      if (world.clock === 0) world.over = true;
    }

    if (world.kickoff > 0) {
      world.kickoff = Math.max(0, world.kickoff - h);
      world.cars.forEach((car) => { car.vx *= 0.9; car.vy *= 0.9; });
      if (world.kickoff > 0) return events;
    }

    world.cars.forEach((car, i) => {
      const input = (inputs && inputs[i]) || blankInput();
      events.boosting[i] = stepCar(car, input, h);
      bounceWalls(car, 0.35, false);
    });

    /* cars bump each other */
    const [a, b] = world.cars;
    const dx = b.x - a.x, dy = b.y - a.y, d = len(dx, dy);
    if (d > 0 && d < a.r + b.r) {
      const nx = dx / d, ny = dy / d, overlap = (a.r + b.r - d) / 2;
      a.x -= nx * overlap; a.y -= ny * overlap;
      b.x += nx * overlap; b.y += ny * overlap;
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        const j = -rel * 0.9;
        a.vx -= nx * j; a.vy -= ny * j;
        b.vx += nx * j; b.vy += ny * j;
      }
    }

    stepBall(world.ball, h);
    world.cars.forEach((car, i) => {
      const power = collide(car, world.ball);
      if (power > 0) events.touches.push({ car: i, power });
    });
    bounceWalls(world.ball, BALL.restitution, true);
    pads(world, h);

    /* a goal is the ball fully past the line inside the mouth */
    if (world.ball.x + world.ball.r < 0 && inGoalMouth(world.ball.y)) {
      world.score[1]++; events.goal = 1; kickoff(world, 0);
    } else if (world.ball.x - world.ball.r > ARENA.w && inGoalMouth(world.ball.y)) {
      world.score[0]++; events.goal = 0; kickoff(world, 1);
    }

    return events;
  }

  /* A bot that plays a decent game: get behind the ball on your attacking side,
     then drive through it. It is not clever, but it punishes standing still. */
  function botInput(world, index) {
    const car = world.cars[index];
    const ball = world.ball;
    const attackX = index === 0 ? ARENA.w : 0;
    const ownX = index === 0 ? 0 : ARENA.w;

    const toGoalX = attackX - ball.x, toGoalY = ARENA.h / 2 - ball.y;
    const gl = len(toGoalX, toGoalY) || 1;

    /* Two states, which is all a decent bot needs: get on the right side of the
       ball, then drive through it at the goal. Aiming at the standoff point the
       whole time is why naive bots nudge the ball sideways forever. */
    const onSide = index === 0 ? car.x < ball.x - 12 : car.x > ball.x + 12;
    let targetX, targetY;
    if (onSide) {
      targetX = ball.x + (toGoalX / gl) * 40;
      targetY = ball.y + (toGoalY / gl) * 40;
    } else {
      targetX = ball.x - (toGoalX / gl) * 78;
      targetY = ball.y - (toGoalY / gl) * 78;
    }

    /* Standing off behind the ball is also how you clear it, since "behind" is
       measured from the goal you are attacking. The only special case is a ball
       sitting on your own line: swing wide rather than tap it in. */
    const ownGoalDist = Math.abs(ball.x - ownX);
    const wrongSide = index === 0 ? car.x > ball.x : car.x < ball.x;
    if (ownGoalDist < 190 && wrongSide) {
      targetX = ball.x + (index === 0 ? 150 : -150);
      targetY = ball.y + (ball.y < ARENA.h / 2 ? 190 : -190);
    }

    const dx = targetX - car.x, dy = targetY - car.y;
    const dist = len(dx, dy);
    let want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const facing = Math.abs(diff) < 0.6;
    const input = blankInput();
    input.steer = clamp(diff * 2.2, -1, 1);
    input.throttle = facing ? 1 : (Math.abs(diff) > 2.4 ? -1 : 0.55);
    input.boost = facing && dist > 240 && car.boost > 12;
    input.flip = facing && dist < 120 && len(car.vx, car.vy) > 500;
    return input;
  }

  const SPEED = {
    ARENA, TICK, CAR, BALL, PADS,
    create, step, kickoff, botInput, blankInput, createCar,
    helpers: { len, clamp, inGoalMouth, collide, stepCar, stepBall, bounceWalls },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SPEED;
  else root.SPEED = SPEED;
})(typeof globalThis !== 'undefined' ? globalThis : this);
