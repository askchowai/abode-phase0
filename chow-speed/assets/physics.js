/* C.H.O.W. Speed — the simulation.
   Top-down Rocket League, running on Rocket League's own numbers: the constants,
   curves, pad layout and kickoff positions come from RocketSim (assets/rlconst.js,
   MIT, © Zealan Lundberg). What is dropped is the third dimension — no aerials,
   no wall play — because a flat game is one an honest evening can finish.

   Nothing here touches the DOM. create(), step(world, inputs, dt) and botInput()
   are the whole surface, which is what makes the thing testable and replayable. */

(function (root) {
  'use strict';

  const RL = (typeof module !== 'undefined' && module.exports)
    ? require('./rlconst.js') : root.RL;

  const TICK = 1 / RL.TICKRATE;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const len = (x, y) => Math.sqrt(x * x + y * y);

  const MODES = {
    soccar: { name: 'Soccar', ballRadius: RL.BALL_RADIUS_SOCCAR, ballMass: RL.BALL_MASS,
      drag: RL.BALL_DRAG, restitution: RL.BALL_RESTITUTION },
    heatseeker: { name: 'Heatseeker', ballRadius: RL.BALL_RADIUS_SOCCAR, ballMass: RL.BALL_MASS,
      drag: 0, restitution: RL.BALL_RESTITUTION },
    /* RocketSim's PUCK_FRICTION is contact friction against the ice, not air drag;
       flattened to two dimensions the honest translation is "slides further than a
       ball", so the puck gets half the ball's decay and its own restitution. */
    snowday: { name: 'Snow day', ballRadius: RL.SNOWDAY.PUCK_RADIUS, ballMass: RL.SNOWDAY.PUCK_MASS,
      drag: RL.BALL_DRAG / 2, restitution: RL.SNOWDAY.PUCK_RESTITUTION },
  };

  /* ---------- world ---------- */

  function spawn(team, index, mode) {
    const table = mode === 'heatseeker' ? RL.CAR_SPAWN_LOCATIONS_HEATSEEKER : RL.CAR_SPAWN_LOCATIONS_SOCCAR;
    const [x, y, yaw] = table[index % table.length];
    /* RL's yaw has 0 pointing at +X, and the blue table already faces the ball.
       Orange is the same table rotated through the centre. */
    return team === 0
      ? { x, y, angle: yaw }
      : { x: -x, y: -y, angle: yaw + Math.PI };
  }

  /* a 1v1 kickoff puts both cars on the centre spawn */
  const KICKOFF_SPAWN = 4;

  function makeCar(team, index, mode) {
    const s = spawn(team, index, mode);
    return {
      team, x: s.x, y: s.y, angle: s.angle, vx: 0, vy: 0,
      boost: RL.BOOST_SPAWN_AMOUNT,
      flipTimer: 0, jumpTimer: 0, bumpTimer: 0, demoTimer: 0,
      supersonic: false, r: RL.HITBOX_LENGTH / 2,
    };
  }

  function makePads() {
    return RL.BOOST.LOCS_BIG.map(([x, y]) => ({ x, y, big: true, live: true, timer: 0 }))
      .concat(RL.BOOST.LOCS_SMALL.map(([x, y]) => ({ x, y, big: false, live: true, timer: 0 })));
  }

  function create(opts) {
    const o = opts || {};
    const mode = MODES[o.mode] ? o.mode : 'soccar';
    const world = {
      mode, modeName: MODES[mode].name,
      t: 0, clock: o.clock === undefined ? 300 : o.clock,
      ball: { x: 0, y: 0, vx: 0, vy: 0, r: MODES[mode].ballRadius },
      cars: [makeCar(0, KICKOFF_SPAWN, mode), makeCar(1, KICKOFF_SPAWN, mode)],
      pads: makePads(),
      score: [0, 0],
      kickoff: 1,
      over: false,
      seeker: { target: 1, speed: RL.HEATSEEKER.INITIAL_TARGET_SPEED, lastTouch: -99 },
      lastTouch: null,
    };
    if (mode === 'heatseeker') {
      world.ball.x = RL.HEATSEEKER.BALL_START[0];
      world.ball.y = RL.HEATSEEKER.BALL_START[1];
      world.ball.vy = RL.HEATSEEKER.BALL_START_VEL[1];
    }
    return world;
  }

  const blankInput = () => ({ throttle: 0, steer: 0, boost: false, jump: false, handbrake: false });

  /* ---------- the car ---------- */

  function stepCar(world, car, input, dt) {
    if (car.demoTimer > 0) {
      car.demoTimer -= dt;
      if (car.demoTimer <= 0) {
        car.demoTimer = 0;
        const s = spawn(car.team, KICKOFF_SPAWN, world.mode);
        car.x = s.x; car.y = s.y; car.angle = s.angle;
        car.vx = 0; car.vy = 0;
        car.boost = RL.BOOST_SPAWN_AMOUNT;
      }
      return false;
    }

    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
    const speed = len(car.vx, car.vy);
    const forward = car.vx * fx + car.vy * fy;

    /* steering: a bicycle model driven by RL's own steer-angle-from-speed curve */
    const steerCurve = input.handbrake ? RL.POWERSLIDE_STEER_ANGLE_FROM_SPEED_CURVE : RL.STEER_ANGLE_FROM_SPEED_CURVE;
    const steerAngle = steerCurve(Math.abs(forward)) * clamp(input.steer, -1, 1);
    car.angle += (forward / (RL.HITBOX_LENGTH * 0.75)) * Math.tan(steerAngle) * dt;

    let ax = 0, ay = 0;

    if (input.throttle > 0.001) {
      const factor = RL.DRIVE_SPEED_TORQUE_FACTOR_CURVE(Math.max(0, forward));
      ax += fx * RL.THROTTLE_ACCEL * factor * input.throttle;
      ay += fy * RL.THROTTLE_ACCEL * factor * input.throttle;
    } else if (input.throttle < -0.001) {
      if (forward > RL.STOPPING_FORWARD_VEL) {
        ax -= (car.vx / (speed || 1)) * RL.BRAKE_ACCEL;
        ay -= (car.vy / (speed || 1)) * RL.BRAKE_ACCEL;
      } else {
        const factor = RL.DRIVE_SPEED_TORQUE_FACTOR_CURVE(Math.abs(Math.min(0, forward)));
        ax += fx * RL.THROTTLE_ACCEL * factor * input.throttle;
        ay += fy * RL.THROTTLE_ACCEL * factor * input.throttle;
      }
    } else if (speed > RL.STOPPING_FORWARD_VEL) {
      /* coasting still brakes, at 15% of the brake */
      const coast = RL.BRAKE_ACCEL * RL.COASTING_BRAKE_FACTOR;
      ax -= (car.vx / speed) * coast;
      ay -= (car.vy / speed) * coast;
    } else {
      car.vx = 0; car.vy = 0;
    }

    let boosting = false;
    if (input.boost && car.boost > 0) {
      boosting = true;
      car.boost = Math.max(0, car.boost - RL.BOOST_USED_PER_SECOND * dt);
      ax += fx * RL.BOOST_ACCEL_GROUND;
      ay += fy * RL.BOOST_ACCEL_GROUND;
    }

    /* a flip: RL gives you 500 uu/s in the direction you are pointing */
    if (input.jump && car.flipTimer <= 0) {
      car.flipTimer = RL.FLIP_TORQUE_TIME + RL.DOUBLEJUMP_MAX_DELAY;
      const scale = input.throttle < -0.001 ? RL.FLIP_BACKWARD_SCALE : RL.FLIP_FORWARD_SCALE;
      const dir = input.throttle < -0.001 ? -1 : 1;
      car.vx += fx * dir * RL.FLIP_INITIAL_VEL_SCALE * scale;
      car.vy += fy * dir * RL.FLIP_INITIAL_VEL_SCALE * scale;
    }
    car.flipTimer = Math.max(0, car.flipTimer - dt);
    car.bumpTimer = Math.max(0, car.bumpTimer - dt);

    car.vx += ax * dt;
    car.vy += ay * dt;

    /* lateral friction: what stops a car being a hovercraft */
    const sx = -fy, sy = fx;
    const side = car.vx * sx + car.vy * sy;
    const grip = RL.LAT_FRICTION_CURVE(Math.min(1, Math.abs(side) / RL.CAR_MAX_SPEED)) *
      (input.handbrake ? RL.HANDBRAKE_LAT_FRICTION_FACTOR_CURVE(0) : 1);
    const scrub = side * clamp(grip * 14 * dt, 0, 1);
    car.vx -= sx * scrub;
    car.vy -= sy * scrub;

    const sp = len(car.vx, car.vy);
    if (sp > RL.CAR_MAX_SPEED) { car.vx = car.vx / sp * RL.CAR_MAX_SPEED; car.vy = car.vy / sp * RL.CAR_MAX_SPEED; }
    car.supersonic = len(car.vx, car.vy) >= RL.SUPERSONIC_START_SPEED;

    car.x += car.vx * dt;
    car.y += car.vy * dt;
    return boosting;
  }

  /* ---------- walls, nets, contact ---------- */

  const inGoalMouth = (x, r) => Math.abs(x) < RL.GOAL_HALF_WIDTH + (r || 0) * 0.1;

  function walls(body, restitution, isBall) {
    let hit = 0;
    const X = RL.ARENA_EXTENT_X, Y = RL.ARENA_EXTENT_Y;
    if (body.x - body.r < -X) { body.x = -X + body.r; body.vx = -body.vx * restitution; hit = 1; }
    if (body.x + body.r > X) { body.x = X - body.r; body.vx = -body.vx * restitution; hit = 1; }
    const throughNet = isBall && inGoalMouth(body.x, body.r);
    if (body.y - body.r < -Y && !throughNet) { body.y = -Y + body.r; body.vy = -body.vy * restitution; hit = 1; }
    if (body.y + body.r > Y && !throughNet) { body.y = Y - body.r; body.vy = -body.vy * restitution; hit = 1; }
    /* the back of the net */
    if (isBall && throughNet) {
      const back = Y + RL.GOAL_DEPTH;
      if (body.y - body.r < -back) { body.y = -back + body.r; body.vy = -body.vy * restitution; }
      if (body.y + body.r > back) { body.y = back - body.r; body.vy = -body.vy * restitution; }
    }
    return hit;
  }

  /* The ball takes a normal impulse plus RL's extra forward impulse from the car's
     nose — the reason a driven touch is worth more than a rolling one. */
  function hitBall(world, car, ball) {
    const dx = ball.x - car.x, dy = ball.y - car.y;
    const d = len(dx, dy);
    const min = car.r + ball.r;
    if (d >= min || d === 0) return 0;

    const nx = dx / d, ny = dy / d;
    ball.x += nx * (min - d);
    ball.y += ny * (min - d);

    const rvx = ball.vx - car.vx, rvy = ball.vy - car.vy;
    const along = rvx * nx + rvy * ny;
    if (along > 0) return 0;

    const mB = MODES[world.mode].ballMass, mC = RL.CAR_MASS;
    const j = -(1 + MODES[world.mode].restitution) * along / (1 / mB + 1 / mC);
    ball.vx += (nx * j) / mB;
    ball.vy += (ny * j) / mB;
    car.vx -= (nx * j) / mC;
    car.vy -= (ny * j) / mC;

    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
    const carSpeed = len(car.vx, car.vy);
    const factor = RL.BALL_CAR_EXTRA_IMPULSE_FACTOR_CURVE(carSpeed);
    const scale = RL.BALL_CAR_EXTRA_IMPULSE_FORWARD_SCALE * factor;
    const deltaVel = Math.min(carSpeed, RL.BALL_CAR_EXTRA_IMPULSE_MAXDELTAVEL_UU);
    const align = Math.max(0, fx * nx + fy * ny);
    ball.vx += fx * align * deltaVel * scale * 0.5;
    ball.vy += fy * align * deltaVel * scale * 0.5;

    world.lastTouch = car.team;
    return Math.abs(j) / mB;
  }

  function bump(world, a, b, events) {
    const dx = b.x - a.x, dy = b.y - a.y, d = len(dx, dy);
    if (d === 0 || d > a.r + b.r) return;
    const nx = dx / d, ny = dy / d, overlap = (a.r + b.r - d) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;

    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rel < 0) {
      const j = -(1 + RL.CARCAR_COLLISION_RESTITUTION) * rel / 2;
      a.vx -= nx * j; a.vy -= ny * j;
      b.vx += nx * j; b.vy += ny * j;
    }

    /* supersonic into another car is a demolition, as in the real game */
    [[a, b], [b, a]].forEach(([hitter, victim]) => {
      if (!hitter.supersonic || hitter.bumpTimer > 0 || victim.demoTimer > 0) return;
      const toward = (victim.x - hitter.x) * hitter.vx + (victim.y - hitter.y) * hitter.vy;
      if (toward <= 0) return;
      victim.demoTimer = RL.DEMO_RESPAWN_TIME;
      victim.vx = 0; victim.vy = 0;
      hitter.bumpTimer = RL.BUMP_COOLDOWN_TIME;
      events.demos.push({ by: hitter.team, of: victim.team });
    });
  }

  function stepBall(world, dt) {
    const ball = world.ball;
    const mode = MODES[world.mode];

    if (world.mode === 'heatseeker') {
      /* the ball steers itself at the target goal and speeds up with every touch */
      const H = RL.HEATSEEKER;
      const ty = world.seeker.target === 1 ? H.TARGET_Y : -H.TARGET_Y;
      const dx = 0 - ball.x, dy = ty - ball.y;
      const d = len(dx, dy) || 1;
      const wantX = (dx / d) * world.seeker.speed, wantY = (dy / d) * world.seeker.speed;
      const blend = clamp(H.HORIZONTAL_BLEND * dt, 0, 1);
      ball.vx += (wantX - ball.vx) * blend;
      ball.vy += (wantY - ball.vy) * blend;
      const sp = len(ball.vx, ball.vy);
      const target = Math.min(world.seeker.speed, H.MAX_SPEED);
      const speedBlend = clamp(H.SPEED_BLEND * dt, 0, 1);
      const want = sp + (target - sp) * speedBlend;
      if (sp > 0) { ball.vx = ball.vx / sp * want; ball.vy = ball.vy / sp * want; }
    } else {
      const d = Math.max(0, 1 - mode.drag * dt);
      ball.vx *= d; ball.vy *= d;
    }

    const sp = len(ball.vx, ball.vy);
    if (sp > RL.BALL_MAX_SPEED) { ball.vx = ball.vx / sp * RL.BALL_MAX_SPEED; ball.vy = ball.vy / sp * RL.BALL_MAX_SPEED; }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  }

  function pads(world, dt) {
    world.pads.forEach((pad) => {
      if (!pad.live) {
        pad.timer -= dt;
        if (pad.timer <= 0) pad.live = true;
        return;
      }
      world.cars.forEach((car) => {
        if (!pad.live || car.demoTimer > 0) return;
        const reach = pad.big ? 208 : 144;      /* pad trigger radii in RL */
        if (len(car.x - pad.x, car.y - pad.y) < reach) {
          car.boost = Math.min(RL.BOOST_MAX, car.boost + (pad.big ? RL.BOOST.AMOUNT_BIG : RL.BOOST.AMOUNT_SMALL));
          pad.live = false;
          pad.timer = pad.big ? RL.BOOST.COOLDOWN_BIG : RL.BOOST.COOLDOWN_SMALL;
        }
      });
    });
  }

  function kickoff(world) {
    const mode = MODES[world.mode];
    world.ball.x = 0; world.ball.y = 0;
    world.ball.vx = 0; world.ball.vy = 0;
    world.ball.r = mode.ballRadius;
    if (world.mode === 'heatseeker') {
      world.ball.x = RL.HEATSEEKER.BALL_START[0] * (world.seeker.target === 1 ? 1 : -1);
      world.ball.y = RL.HEATSEEKER.BALL_START[1] * (world.seeker.target === 1 ? 1 : -1);
      world.seeker.speed = RL.HEATSEEKER.INITIAL_TARGET_SPEED;
    }
    world.cars.forEach((car, i) => {
      const s = spawn(car.team, KICKOFF_SPAWN, world.mode);
      car.x = s.x; car.y = s.y; car.angle = s.angle;
      car.vx = 0; car.vy = 0;
      car.boost = RL.BOOST_SPAWN_AMOUNT;
      car.demoTimer = 0; car.flipTimer = 0;
    });
    world.pads.forEach((p) => { p.live = true; p.timer = 0; });
    world.kickoff = 1;
    world.lastTouch = null;
  }

  function step(world, inputs, dt) {
    const events = { goal: null, touches: [], demos: [], boosting: [false, false] };
    if (world.over) return events;
    const h = dt === undefined ? TICK : dt;

    world.t += h;
    if (world.clock > 0) {
      world.clock = Math.max(0, world.clock - h);
      if (world.clock === 0) world.over = true;
    }

    if (world.kickoff > 0) {
      world.kickoff = Math.max(0, world.kickoff - h);
      if (world.kickoff > 0) return events;
    }

    world.cars.forEach((car, i) => {
      events.boosting[i] = stepCar(world, car, (inputs && inputs[i]) || blankInput(), h);
      if (car.demoTimer <= 0) walls(car, RL.ARENA_COLLISION_BASE_RESTITUTION, false);
    });

    if (world.cars[0].demoTimer <= 0 && world.cars[1].demoTimer <= 0) {
      bump(world, world.cars[0], world.cars[1], events);
    }

    stepBall(world, h);
    world.cars.forEach((car, i) => {
      if (car.demoTimer > 0) return;
      const power = hitBall(world, car, world.ball);
      if (power > 0) {
        events.touches.push({ car: i, power });
        if (world.mode === 'heatseeker' && world.t - world.seeker.lastTouch > RL.HEATSEEKER.MIN_SPEEDUP_INTERVAL) {
          world.seeker.lastTouch = world.t;
          world.seeker.target = car.team === 0 ? 1 : 0;
          world.seeker.speed = Math.min(RL.HEATSEEKER.MAX_SPEED,
            world.seeker.speed + RL.HEATSEEKER.TARGET_SPEED_INCREMENT);
        }
      }
    });
    walls(world.ball, MODES[world.mode].restitution, true);
    pads(world, h);

    const past = RL.GOAL_SCORE_THRESHOLD_Y + world.ball.r;
    if (world.ball.y > past && inGoalMouth(world.ball.x, world.ball.r)) {
      world.score[0]++; events.goal = 0; kickoff(world);
    } else if (world.ball.y < -past && inGoalMouth(world.ball.x, world.ball.r)) {
      world.score[1]++; events.goal = 1; kickoff(world);
    }

    return events;
  }

  /* ---------- a bot that plays the same game you do ---------- */

  function botInput(world, index) {
    const car = world.cars[index];
    const ball = world.ball;
    const input = blankInput();
    if (car.demoTimer > 0) return input;

    const attackY = car.team === 0 ? RL.ARENA_EXTENT_Y : -RL.ARENA_EXTENT_Y;
    const ownY = -attackY;
    const toGoalX = 0 - ball.x, toGoalY = attackY - ball.y;
    const gl = len(toGoalX, toGoalY) || 1;

    const onSide = car.team === 0 ? car.y < ball.y - 30 : car.y > ball.y + 30;
    let tx, ty;
    if (onSide) {
      tx = ball.x + (toGoalX / gl) * 60;
      ty = ball.y + (toGoalY / gl) * 60;
    } else {
      tx = ball.x - (toGoalX / gl) * 260;
      ty = ball.y - (toGoalY / gl) * 260;
    }

    /* do not shepherd the ball into your own net */
    const nearOwnLine = Math.abs(ball.y - ownY) < 900;
    const wrongSide = car.team === 0 ? car.y > ball.y : car.y < ball.y;
    if (nearOwnLine && wrongSide) {
      tx = ball.x + (ball.x < 0 ? -700 : 700);
      ty = ball.y + (car.team === 0 ? -500 : 500);
    }

    const dx = tx - car.x, dy = ty - car.y;
    const dist = len(dx, dy);
    let diff = Math.atan2(dy, dx) - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const facing = Math.abs(diff) < 0.5;
    input.steer = clamp(diff * 2.4, -1, 1);
    input.throttle = Math.abs(diff) > 2.3 ? -1 : 1;
    input.boost = facing && dist > 900 && car.boost > 10;
    input.handbrake = Math.abs(diff) > 1.2 && len(car.vx, car.vy) > 900;
    input.jump = facing && dist < 400 && len(car.vx, car.vy) > 1100 && car.flipTimer <= 0;
    return input;
  }

  const SPEED = {
    RL, MODES, TICK,
    ARENA: { x: RL.ARENA_EXTENT_X, y: RL.ARENA_EXTENT_Y, goalHalf: RL.GOAL_HALF_WIDTH, goalDepth: RL.GOAL_DEPTH },
    create, step, kickoff, botInput, blankInput, spawn,
    helpers: { len, clamp, inGoalMouth, hitBall, stepCar, stepBall, walls, bump },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SPEED;
  else root.SPEED = SPEED;
})(typeof globalThis !== 'undefined' ? globalThis : this);
