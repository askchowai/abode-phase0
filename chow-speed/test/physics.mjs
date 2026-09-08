/* The simulation, checked without a browser. If the physics is a library, it can
   be held to a library's standard: determinism, limits that hold, and rules that
   do not depend on anything being drawn. */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../assets/physics.js');

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
  ok('a game starts level and centred', w.score[0] === 0 && w.score[1] === 0 &&
     w.ball.x === S.ARENA.w / 2 && w.ball.y === S.ARENA.h / 2);
  ok('both cars start in their own half', w.cars[0].x < S.ARENA.w / 2 && w.cars[1].x > S.ARENA.w / 2);
  drive(w, 120);
  ok('the clock runs down', Math.round(w.clock) === 179, w.clock.toFixed(2));
}

/* --- driving --- */
{
  const clearRun = () => { const w = S.create(); w.kickoff = 0; w.ball.y = 60; w.cars[0].y = 400; return w; };
  const w = clearRun();
  drive(w, 60, { throttle: 1, steer: 0, boost: false, flip: false });
  const cruised = speed(w.cars[0]);
  ok('throttle moves the car', cruised > 300, `${cruised.toFixed(0)} u/s`);
  ok('a car cannot exceed its limit without boost', cruised <= S.CAR.maxSpeed + 1);

  const b = clearRun();
  drive(b, 60, { throttle: 1, steer: 0, boost: true, flip: false });
  ok('boost is faster than throttle alone', speed(b.cars[0]) > cruised + 80,
     `${speed(b.cars[0]).toFixed(0)} vs ${cruised.toFixed(0)}`);
  ok('boost is spent while it is held', b.cars[0].boost < 34, b.cars[0].boost.toFixed(1));

  const empty = clearRun(); empty.cars[0].boost = 0;
  drive(empty, 60, { throttle: 1, steer: 0, boost: true, flip: false });
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
  const w = S.create(); w.kickoff = 0;
  drive(w, 60, { throttle: 1, steer: 0, boost: false, flip: false });
  const before = speed(w.cars[0]);
  S.step(w, [{ throttle: 1, steer: 0, boost: false, flip: true }, S.blankInput()], S.TICK);
  const after = speed(w.cars[0]);
  ok('a flip is a burst of speed', after > before + 400, `${before.toFixed(0)} -> ${after.toFixed(0)}`);
  S.step(w, [{ throttle: 1, steer: 0, boost: false, flip: true }, S.blankInput()], S.TICK);
  ok('you cannot flip twice in a row', speed(w.cars[0]) < after + 100);
}

/* --- walls and the net --- */
{
  const w = S.create(); w.kickoff = 0;
  w.ball.x = 60; w.ball.y = 80; w.ball.vx = -900;
  drive(w, 30);
  ok('the ball bounces off the wall', w.ball.vx > 0 && w.ball.x >= w.ball.r - 1);

  const g = S.create(); g.kickoff = 0;
  g.ball.x = 80; g.ball.y = S.ARENA.h / 2; g.ball.vx = -1400;
  drive(g, 40);
  ok('the ball can be scored through the mouth', g.score[1] === 1, JSON.stringify(g.score));
  ok('a goal resets to kickoff', g.ball.x === S.ARENA.w / 2 && g.kickoff > 0);

  const wide = S.create(); wide.kickoff = 0;
  wide.ball.x = 80; wide.ball.y = S.ARENA.h / 2 - S.ARENA.goalW; wide.ball.vx = -1400;
  drive(wide, 40);
  ok('a shot wide of the post is not a goal', wide.score[0] === 0 && wide.score[1] === 0);
}

/* --- hitting the ball --- */
{
  const w = S.create(); w.kickoff = 0;
  w.cars[0].x = S.ARENA.w / 2 - 90; w.cars[0].y = S.ARENA.h / 2; w.cars[0].angle = 0;
  drive(w, 60, { throttle: 1, steer: 0, boost: true, flip: false });
  ok('driving into the ball moves it', w.ball.vx > 200, `ball vx ${w.ball.vx.toFixed(0)}`);
  ok('the ball keeps its own limit', speed(w.ball) <= S.BALL.maxSpeed + 1);
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
  ok('two bots keep the ball on the pitch',
     d.ball.x > -S.ARENA.goalDepth - 5 && d.ball.x < S.ARENA.w + S.ARENA.goalDepth + 5 &&
     d.ball.y > -5 && d.ball.y < S.ARENA.h + 5, `${d.ball.x.toFixed(0)},${d.ball.y.toFixed(0)}`);
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
