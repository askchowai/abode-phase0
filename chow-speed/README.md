# C.H.O.W. Speed

A rocket-powered ball game: drive, boost, flip, score. Two cars, one ball, three
minutes.

Built after [RocketSim](https://github.com/ZealanL/RocketSim), which is not a game
— it is a headless C++ simulation of Rocket League's physics, and it needs the
real game's collision meshes to run. What is worth taking from it is the shape:
**the physics is a library and the game is a client of it.** So that is how this
is built.

## Play it

```
npm start          # http://localhost:4174
```

Or open `index.html`. On a phone, hold anywhere on the pitch to drive at that
point and use the two thumb pads for boost and flip. On a desk, `W A S D` to
drive, `shift` to boost, `space` to flip, `P` to pause.

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
| `assets/physics.js` | The whole simulation. No DOM, no canvas, no timers — `create()`, `step(world, inputs, dt)`, and a bot that takes the same input shape a player does. Runs in node or a browser |
| `assets/game.js` | Input, interpolated drawing, sound, HUD. Fixed 120Hz steps with an interpolated draw, so it feels identical at 60 and 120 frames a second |
| `assets/style.css` | askchow.ai's palette — navy, electric blue, cyan |

The car is deliberately not a puck: sideways velocity is scrubbed off every tick,
steering authority scales with speed, and the nose of the car adds a shove to the
ball on contact. That is what makes a touch feel like a touch.

## What is not here

Aerials, demolitions, teams larger than one, and a third dimension. The
simulation is top-down; adding height would mean a real broad-phase and a car
that can pitch and roll, which is a bigger piece of work than an evening.
