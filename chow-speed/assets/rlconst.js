/* Rocket League's own numbers, lifted from RocketSim's RLConst.h.
   https://github.com/ZealanL/RocketSim — MIT licensed, © Zealan Lundberg.
   See THIRD-PARTY.md.

   These are the real values: the arena is 8192 by 10240 uu, the ball is 91.25 uu
   across, boost burns a third of a tank a second. Keeping them exact means the
   game plays at Rocket League's proportions rather than at made-up ones, and it
   means anything measured here can be checked against the real thing. */

(function (root) {
  'use strict';

  const PI = Math.PI;

  /* a piecewise-linear curve, the same shape RocketSim uses for its tables */
  function curve(points) {
    return function (x) {
      if (!points.length) return 1;
      if (x <= points[0][0]) return points[0][1];
      for (let i = 1; i < points.length; i++) {
        if (x <= points[i][0]) {
          const [x0, y0] = points[i - 1], [x1, y1] = points[i];
          const t = (x - x0) / (x1 - x0 || 1);
          return y0 + (y1 - y0) * t;
        }
      }
      return points[points.length - 1][1];
    };
  }

  const RL = {
    ARENA_EXTENT_X: 4096,
    ARENA_EXTENT_Y: 5120,
    GOAL_HALF_WIDTH: 892.755,
    GOAL_SCORE_THRESHOLD_Y: 5124.25,
    GOAL_DEPTH: 880,

    CAR_MASS: 180,
    BALL_MASS: 30,                       /* CAR_MASS / 6 */

    CAR_MAX_SPEED: 2300,
    SUPERSONIC_START_SPEED: 2200,
    BALL_MAX_SPEED: 6000,

    BALL_RADIUS_SOCCAR: 91.25,
    BALL_DRAG: 0.03,
    BALL_FRICTION: 0.35,
    BALL_RESTITUTION: 0.6,

    /* Octane, top-down: length by width */
    HITBOX_LENGTH: 120.507,
    HITBOX_WIDTH: 86.6994,

    BOOST_MAX: 100,
    BOOST_USED_PER_SECOND: 100 / 3,
    BOOST_ACCEL_GROUND: 2975 / 3,
    BOOST_SPAWN_AMOUNT: 100 / 3,

    /* throttle at rest, braking, and coasting, in uu/s² */
    THROTTLE_ACCEL: 1600,
    BRAKE_ACCEL: 3500,
    COASTING_BRAKE_FACTOR: 0.15,
    STOPPING_FORWARD_VEL: 25,

    FLIP_INITIAL_VEL_SCALE: 500,
    FLIP_FORWARD_SCALE: 1,
    FLIP_SIDE_SCALE: 1.9,
    FLIP_BACKWARD_SCALE: 2.5,
    FLIP_TORQUE_TIME: 0.65,
    DOUBLEJUMP_MAX_DELAY: 1.25,

    BALL_CAR_EXTRA_IMPULSE_FORWARD_SCALE: 0.65,
    BALL_CAR_EXTRA_IMPULSE_MAXDELTAVEL_UU: 4600,

    BUMP_COOLDOWN_TIME: 0.25,
    BUMP_MIN_FORWARD_DIST: 64.5,
    DEMO_RESPAWN_TIME: 3,

    ARENA_COLLISION_BASE_RESTITUTION: 0.3,
    CARCAR_COLLISION_RESTITUTION: 0.1,

    /* Input: forward car speed. Output: torque factor. */
    DRIVE_SPEED_TORQUE_FACTOR_CURVE: curve([[0, 1], [1400, 0.1], [1410, 0]]),
    /* Input: forward car speed. Output: maximum steer angle, radians. */
    STEER_ANGLE_FROM_SPEED_CURVE: curve([
      [0, 0.53356], [500, 0.3193], [1000, 0.18203],
      [1500, 0.1057], [1750, 0.08507], [3000, 0.03454],
    ]),
    POWERSLIDE_STEER_ANGLE_FROM_SPEED_CURVE: curve([[0, 0.39235], [2500, 0.1261]]),
    LAT_FRICTION_CURVE: curve([[0, 1], [1, 0.2]]),
    HANDBRAKE_LAT_FRICTION_FACTOR_CURVE: curve([[0, 0.1]]),
    BALL_CAR_EXTRA_IMPULSE_FACTOR_CURVE: curve([[0, 0.65], [500, 0.65], [2300, 0.55]]),

    BOOST: {
      COOLDOWN_BIG: 10,
      COOLDOWN_SMALL: 4,
      AMOUNT_BIG: 100,
      AMOUNT_SMALL: 12,
      LOCS_BIG: [
        [-3584, 0], [3584, 0], [-3072, 4096], [3072, 4096], [-3072, -4096], [3072, -4096],
      ],
      LOCS_SMALL: [
        [0, -4240], [-1792, -4184], [1792, -4184], [-940, -3308], [940, -3308], [0, -2816],
        [-3584, -2484], [3584, -2484], [-1788, -2300], [1788, -2300], [-2048, -1036],
        [0, -1024], [2048, -1036], [-1024, 0], [1024, 0], [-2048, 1036], [0, 1024],
        [2048, 1036], [-1788, 2300], [1788, 2300], [-3584, 2484], [3584, 2484], [0, 2816],
        [-940, 3308], [940, 3308], [-1792, 4184], [1792, 4184], [0, 4240],
      ],
    },

    /* blue team; orange is these mirrored through the centre */
    CAR_SPAWN_LOCATIONS_SOCCAR: [
      [-2048, -2560, PI / 4], [2048, -2560, (PI / 4) * 3],
      [-256, -3840, PI / 2], [256, -3840, PI / 2], [0, -4608, PI / 2],
    ],
    CAR_SPAWN_LOCATIONS_HEATSEEKER: [
      [-1000, -4620, PI / 2], [1000, -4620, PI / 2],
      [-2000, -4620, PI / 2], [2000, -4620, PI / 2],
    ],

    HEATSEEKER: {
      INITIAL_TARGET_SPEED: 2900,
      TARGET_SPEED_INCREMENT: 85,
      MIN_SPEEDUP_INTERVAL: 1,
      TARGET_Y: 5120,
      HORIZONTAL_BLEND: 1.45,
      SPEED_BLEND: 0.3,
      MAX_SPEED: 4600,
      BALL_START: [-1000, -2220],
      BALL_START_VEL: [0, -65],
    },

    SNOWDAY: {
      PUCK_RADIUS: 114.25,
      PUCK_MASS: 50,
      PUCK_FRICTION: 0.1,
      PUCK_RESTITUTION: 0.3,
      PUCK_GROUND_STICK_FORCE: 70,
    },

    TICKRATE: 120,
    curve,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RL;
  else root.RL = RL;
})(typeof globalThis !== 'undefined' ? globalThis : this);
