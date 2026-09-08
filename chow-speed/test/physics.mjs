/* The simulation, checked without a browser. If the physics is a library, it can
   be held to a library's standard: determinism, limits that hold, and rules that
   do not depend on anything being drawn. */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../assets/physics.js');
const RL = S.RL;

let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) fail++;
};
const drive = (w, ticks, a, b) => {
  for (let i = 0; i < ticks; i++) S.step(w, [a || S.blankInput(), b || S.blankInput()], S.TICK);
};
const speed = (o) => Math.hypot(o.vx, o.vy);

/* --- the shape of a game --- */
{
  const w = S.create();
  ok('a game starts level, with the ball on the centre spot',
     w.score[0] === 0 && w.score[1] === 0 && w.ball.x === 0 && w.ball.y === 0);
  ok('the pitch is Rocket League sized', S.ARENA.x === 4096 && S.ARENA.y === 5120);
  ok('the ball is Rocket League sized', w.ball.r === RL.BALL_RADIUS_SOCCAR);
  ok('both cars kick off from their own goal line', w.cars[0].y < 0 && w.cars[1].y > 0);
  ok('both face the ball', Math.abs(Math.cos(w.cars[0].angle)) < 0.01 &&
     Math.sin(w.cars[0].angle) > 0.99 && Math.sin(w.cars[1].angle) < -0.99);
  drive(w, 120);
  ok('the clock runs down', Math.round(w.clock) === 299, w.clock.toFixed(2));
}

/* --- driving --- */
{
  /* park the ball in a corner so a straight run never touches it */
  const clearRun = () => {
    const w = S.create();
    w.kickoff = 0;
    w.ball.x = 3000; w.ball.y = 3000;   /* out of the way */
    w.pads = [];                        /* and no free boost on the run */
    return w;
  };
  const w = clearRun();
  drive(w, 120 * 4, { throttle: 1, steer: 0, boost: false });
  const cruised = speed(w.cars[0]);
  ok('throttle moves the car', cruised > 300, `${cruised.toFixed(0)} u/s`);
  ok('throttle alone stops at Rocket League\'s throttle limit', cruised > 1300 && cruised < 1450,
     `${cruised.toFixed(0)} of 1410`);

  const b = clearRun();
  b.cars[0].boost = 100;
  drive(b, 120 * 4, { throttle: 1, steer: 0, boost: true });
  ok('boost takes you past the throttle limit, to Rocket League\'s own top speed',
     speed(b.cars[0]) > 2200 && speed(b.cars[0]) <= RL.CAR_MAX_SPEED + 1, speed(b.cars[0]).toFixed(0));
  ok('a full tank lasts three seconds, as in the real game',
     b.cars[0].boost === 0 && Math.abs(100 / RL.BOOST_USED_PER_SECOND - 3) < 0.01);
  ok('that speed counts as supersonic', b.cars[0].supersonic);

  const empty = clearRun(); empty.cars[0].boost = 0;
  drive(empty, 120 * 4, { throttle: 1, steer: 0, boost: true });
  ok('an empty tank gives nothing away', Math.abs(speed(empty.cars[0]) - cruised) < 12);
}

/* --- steering only works when you are moving --- */
{
  const still = S.create(); still.kickoff = 0;
  const a0 = still.cars[0].angle;
  drive(still, 60, { throttle: 0, steer: 1, boost: false, flip: false });
  ok('a stationary car does not pirouette', Math.abs(still.cars[0].angle - a0) < 0.05);

  const rolling = S.create(); rolling.kickoff = 0;
  drive(rolling, 90, { throttle: 1, steer: 0, boost: false, flip: false });
  const a1 = rolling.cars[0].angle;
  drive(rolling, 60, { throttle: 1, steer: 1, boost: false, flip: false });
  ok('a moving car turns', Math.abs(rolling.cars[0].angle - a1) > 0.4);
}

/* --- the flip --- */
{
  const w = S.create(); w.kickoff = 0; w.pads = [];
  w.ball.x = 3000; w.ball.y = 3000;
  drive(w, 60, { throttle: 1, steer: 0, boost: false });
  const before = speed(w.cars[0]);
  S.step(w, [{ throttle: 1, steer: 0, boost: false, jump: true }, S.blankInput()], S.TICK);
  const after = speed(w.cars[0]);
  ok('a flip adds Rocket League\'s 500 uu/s', after - before > 480 && after - before < 520,
     `${before.toFixed(0)} -> ${after.toFixed(0)}`);
  S.step(w, [{ throttle: 1, steer: 0, boost: false, jump: true }, S.blankInput()], S.TICK);
  ok('you cannot flip again until it resets', speed(w.cars[0]) < after + 100);
}

/* --- walls and the net --- */
{
  const w = S.create(); w.kickoff = 0;
  w.ball.x = -S.ARENA.x + 200; w.ball.y = 1000; w.ball.vx = -2000;
  drive(w, 30);
  ok('the ball bounces off the side wall', w.ball.vx > 0 && w.ball.x >= -S.ARENA.x + w.ball.r - 1);

  const g = S.create(); g.kickoff = 0;
  g.ball.x = 0; g.ball.y = 4600; g.ball.vy = 3000;
  drive(g, 60);
  ok('a shot into the mouth is a goal', g.score[0] === 1, JSON.stringify(g.score));
  ok('a goal resets to kickoff', g.ball.x === 0 && g.ball.y === 0 && g.kickoff > 0);

  const post = S.create(); post.kickoff = 0;
  post.ball.x = RL.GOAL_HALF_WIDTH + 400; post.ball.y = 4600; post.ball.vy = 3000;
  drive(post, 60);
  ok('a shot wide of the post is not a goal', post.score[0] === 0 && post.score[1] === 0);
  ok('and it comes back off the back wall', post.ball.vy < 0);

  const own = S.create(); own.kickoff = 0;
  own.ball.y = -4600; own.ball.vy = -3000;
  drive(own, 60);
  ok('the other net works the same way', own.score[1] === 1);
}

/* --- hitting the ball --- */
{
  const w = S.create(); w.kickoff = 0; w.pads = [];
  w.cars[0].x = 0; w.cars[0].y = -1200; w.cars[0].angle = Math.PI / 2;
  w.cars[0].boost = 100;
  drive(w, 120 * 2, { throttle: 1, steer: 0, boost: true });
  ok('driving through the ball sends it up the pitch', w.ball.vy > 1000, `ball vy ${w.ball.vy.toFixed(0)}`);
  ok('the ball keeps Rocket League\'s own ceiling', speed(w.ball) <= RL.BALL_MAX_SPEED + 1);
  ok('the car is slowed by the contact', speed(w.cars[0]) < RL.CAR_MAX_SPEED);
}

/* --- demolitions --- */
{
  const w = S.create(); w.kickoff = 0; w.pads = [];
  w.cars[0].x = 0; w.cars[0].y = -800; w.cars[0].angle = Math.PI / 2;
  w.cars[0].vx = 0; w.cars[0].vy = RL.SUPERSONIC_START_SPEED + 50;
  w.cars[0].supersonic = true;
  w.cars[1].x = 0; w.cars[1].y = -700; w.cars[1].vx = 0; w.cars[1].vy = 0;
  let demo = null;
  for (let i = 0; i < 10 && !demo; i++) {
    const ev = S.step(w, [{ throttle: 1, steer: 0, boost: false }, S.blankInput()], S.TICK);
    if (ev.demos.length) demo = ev.demos[0];
  }
  ok('a supersonic car demolishes the one it hits', !!demo && demo.by === 0, JSON.stringify(demo));
  ok('the victim is out for three seconds', w.cars[1].demoTimer > 2.9);
  drive(w, 120 * 4);
  ok('and comes back afterwards', w.cars[1].demoTimer === 0);
}

/* --- boost pads --- */
{
  const w = S.create(); w.kickoff = 0;
  const bigPad = w.pads.find((p) => p.big);
  w.cars[0].boost = 5;
  w.cars[0].x = bigPad.x; w.cars[0].y = bigPad.y;
  drive(w, 2);
  ok('a big pad fills the tank', w.cars[0].boost === 100 && !bigPad.live);
  w.cars[0].x = S.ARENA.w / 2; w.cars[0].y = S.ARENA.h / 2 + 250;   /* drive off it */
  drive(w, 120 * 11);
  ok('a taken pad comes back', bigPad.live);
}

/* --- determinism, which is the whole point of a headless sim --- */
{
  const script = [];
  for (let i = 0; i < 900; i++) {
    script.push({ throttle: i % 7 ? 1 : -1, steer: Math.sin(i / 40), boost: i % 11 === 0, flip: i % 137 === 0 });
  }
  const run = () => {
    const w = S.create();
    script.forEach((inp) => S.step(w, [inp, S.botInput(w, 1)], S.TICK));
    return JSON.stringify([w.ball, w.cars, w.score]);
  };
  ok('the same inputs give exactly the same game', run() === run());
}

/* --- the bot --- */
{
  const w = S.create();
  let ticks = 0;
  while (w.score[1] === 0 && ticks < 120 * 60) {
    S.step(w, [S.blankInput(), S.botInput(w, 1)], S.TICK);
    ticks++;
  }
  ok('the bot scores against a car that never moves', w.score[1] > 0, `${(ticks / 120).toFixed(1)}s`);

  const d = S.create();
  for (let i = 0; i < 120 * 20; i++) S.step(d, [S.botInput(d, 0), S.botInput(d, 1)], S.TICK);
  ok('two bots keep the ball inside the arena',
     Math.abs(d.ball.x) <= S.ARENA.x + 5 &&
     Math.abs(d.ball.y) <= S.ARENA.y + S.ARENA.goalDepth + 5,
     `${d.ball.x.toFixed(0)},${d.ball.y.toFixed(0)}`);
  ok('and they actually play', d.score[0] + d.score[1] >= 0 && d.t > 19);
}

/* --- the other game modes --- */
{
  const h = S.create({ mode: 'heatseeker' });
  ok('heatseeker starts where Rocket League starts it',
     h.ball.x === RL.HEATSEEKER.BALL_START[0] && h.ball.y === RL.HEATSEEKER.BALL_START[1]);
  h.kickoff = 0;
  const speed0 = h.seeker.speed;
  drive(h, 120 * 10);
  ok('the ball drives itself at a goal', speed(h.ball) > 1500, speed(h.ball).toFixed(0));
  ok('and it eventually goes in', h.score[0] + h.score[1] > 0, JSON.stringify(h.score));
  ok('it starts at the speed the real mode starts at', speed0 === RL.HEATSEEKER.INITIAL_TARGET_SPEED);

  const s2 = S.create({ mode: 'snowday' });
  ok('snow day swaps the ball for a puck', s2.ball.r === RL.SNOWDAY.PUCK_RADIUS);
  s2.kickoff = 0;
  s2.ball.vx = 1200;
  const start = speed(s2.ball);
  drive(s2, 120 * 2);
  ok('the puck barely slows down', speed(s2.ball) > start * 0.7, `${start.toFixed(0)} -> ${speed(s2.ball).toFixed(0)}`);

  const soccar = S.create();
  soccar.kickoff = 0;
  soccar.ball.vx = 1200;
  drive(soccar, 120 * 2);
  ok('a soccar ball slows more than a puck', speed(soccar.ball) < speed(s2.ball));
}

/* --- full time --- */
{
  const w = S.create({ clock: 2 });
  drive(w, 120 * 3);
  ok('the game ends when the clock does', w.over === true && w.clock === 0);
  const frozen = JSON.stringify(w.ball);
  drive(w, 120);
  ok('nothing moves after full time', JSON.stringify(w.ball) === frozen);
}

console.log(fail ? `\n${fail} failing` : '\nall green');
process.exit(fail ? 1 : 0);
