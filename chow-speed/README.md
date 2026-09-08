# C.H.O.W. Speed

A rocket-powered ball game: drive, boost, flip, score. Two cars, one ball, three
minutes.

Built on [RocketSim](https://github.com/ZealanL/RocketSim), which is not a game —
it is a headless C++ simulation of Rocket League's physics, and it needs the real
game's collision meshes to run. Two things are taken from it, both openly:

- **Its numbers.** `assets/rlconst.js` is a transcription of `RLConst.h`: the
  8192 × 10240 arena, the 91.25 uu ball, 2300 uu/s top speed, 2200 for supersonic,
  a third of a tank of boost per second, the steer-angle-by-speed curve, the
  drive-torque falloff that caps throttle at 1410, all 34 boost pads at their real
  coordinates with their real cooldowns, the kickoff spawns, and the Heatseeker and
  Snow day constants. MIT licensed — see `THIRD-PARTY.md`.
- **Its shape.** The physics is a library and the game is a client of it, so the
  whole simulation can be stepped, replayed and tested with no browser present.

What is not taken is code: this is written from scratch, in two dimensions, in
JavaScript. Flattening a 3D game means no aerials and no wall play, and where a
constant could not be translated flatly the reading is noted beside it.

## Play it

```
npm start          # http://localhost:4174
```

Or open `index.html`. On a phone, hold anywhere on the pitch to drive at that
point and use the thumb pads for boost, drift and flip. On a desk, `W A S D` to
drive, `shift` to boost, `space` to flip, `L` to drift, `P` to pause.

## Test it

```
npm test
```

`test/physics.mjs` steps the simulation with no browser at all and holds it to a
library's standard: speed limits that hold, boost that runs out, steering that
does nothing at a standstill, a flip that fires once, a ball that goes in off the
mouth of the goal and not off the post, pads that respawn, a game that stops at
full time — and determinism, because a simulation that cannot be replayed exactly
is not much use for training anything. `test/page.mjs` checks the page around it.

## How it is put together

| | |
|---|---|
| `assets/rlconst.js` | Rocket League's own constants and curves, from RocketSim |
| `assets/physics.js` | The whole simulation. No DOM, no canvas, no timers — `create()`, `step(world, inputs, dt)`, and a bot that takes the same input shape a player does. Runs in node or a browser |
| `assets/game.js` | Input, interpolated drawing, sound, HUD. Fixed 120Hz steps with an interpolated draw, so it feels identical at 60 and 120 frames a second |
| `assets/style.css` | askchow.ai's palette — navy, electric blue, cyan |

The car is deliberately not a puck: sideways velocity is scrubbed off every tick,
steering authority scales with speed, and the nose of the car adds a shove to the
ball on contact. That is what makes a touch feel like a touch.

## Modes

**Soccar** is the ordinary game. **Heatseeker** gives the ball a mind: it steers
itself at whichever goal you last hit it towards and gains 85 uu/s of target speed
on every touch, up to 4600. **Snow day** swaps the ball for the puck — 114.25 uu
across, 50 kg, and it slides.

Demolitions are in: hit another car while supersonic and it is gone for three
seconds, exactly as long as the real game gives you.

## What is not here

Aerials, wall play, teams larger than one, and the third dimension generally. The
simulation is flat; adding height would mean a real broad phase and a car that can
pitch and roll, which is a different project.
