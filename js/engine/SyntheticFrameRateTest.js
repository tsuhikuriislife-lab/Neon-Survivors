import { FixedStepClock } from './FixedStepClock.js';
import { RenderInterpolator } from './RenderInterpolator.js';

const TEST_REFRESH_RATES = [30, 60, 120, 144];
const TEST_DURATION_SECONDS = 10;
const SIMULATION_HZ = 60;
const TEST_DISTANCE_PER_STEP = 2.4;
const TOLERANCE = 1e-6;

/**
 * Runs deterministic timing and transform checks without touching the live game.
 * The returned samples can be printed with console.table(result.rates).
 */
export function runSyntheticFrameRateTest() {
  const rateResults = [];
  const expectedSteps = TEST_DURATION_SECONDS * SIMULATION_HZ;
  const expectedTravel = expectedSteps * TEST_DISTANCE_PER_STEP;

  for (let rateIndex = 0; rateIndex < TEST_REFRESH_RATES.length; rateIndex++) {
    const refreshRate = TEST_REFRESH_RATES[rateIndex];
    const clock = new FixedStepClock();
    const interpolator = new RenderInterpolator();
    const root = createDisplayObject();
    const actor = createDisplayObject();
    root.children.push(actor);
    interpolator.reset(root);

    let simulationSteps = 0;
    let simulatedSeconds = 0;
    let physicsX = 0;
    let previousRenderedX = actor.x;
    let largestRenderMove = 0;
    const virtualFrames = refreshRate * TEST_DURATION_SECONDS;

    const updateStep = (dt) => {
      interpolator.beginStep(root);
      physicsX += TEST_DISTANCE_PER_STEP;
      simulatedSeconds += dt;
      simulationSteps++;
      actor.x = physicsX;
      interpolator.captureStep(root);
      return true;
    };

    for (let frame = 1; frame <= virtualFrames; frame++) {
      clock.advance(1 / refreshRate, updateStep);
      interpolator.render(root, clock.alpha);
      const renderMove = Math.abs(actor.x - previousRenderedX);
      if (renderMove > largestRenderMove) largestRenderMove = renderMove;
      previousRenderedX = actor.x;
    }

    assertClose(simulationSteps, expectedSteps, 0, `${refreshRate} Hz fixed-step count`);
    assertClose(simulatedSeconds, TEST_DURATION_SECONDS, TOLERANCE, `${refreshRate} Hz simulated time`);
    assertClose(physicsX, expectedTravel, TOLERANCE, `${refreshRate} Hz physics travel`);

    const maximumExpectedRenderMove = TEST_DISTANCE_PER_STEP * SIMULATION_HZ / refreshRate;
    if (largestRenderMove > maximumExpectedRenderMove + TOLERANCE) {
      throw new Error(`${refreshRate} Hz interpolation exceeded its expected per-frame travel.`);
    }

    rateResults.push({
      refreshRateHz: refreshRate,
      virtualFrames,
      simulationSteps,
      simulatedSeconds: round(simulatedSeconds),
      physicsTravel: round(physicsX),
      largestRenderMove: round(largestRenderMove),
      maxExpectedRenderMove: round(maximumExpectedRenderMove)
    });
  }

  const interpolationResults = runTransformChecks();
  return {
    passed: true,
    fixedStepHz: SIMULATION_HZ,
    durationSeconds: TEST_DURATION_SECONDS,
    rates: rateResults,
    interpolation: interpolationResults
  };
}

function runTransformChecks() {
  const interpolator = new RenderInterpolator();
  const root = createDisplayObject();
  const actor = createDisplayObject(100, 50, degreesToRadians(179));
  root.children.push(actor);
  interpolator.reset(root);

  interpolator.beginStep(root);
  actor.x = 110;
  actor.y = 70;
  actor.rotation = degreesToRadians(-179);
  interpolator.captureStep(root);
  interpolator.render(root, 0.5);

  assertClose(actor.x, 105, TOLERANCE, 'midpoint x interpolation');
  assertClose(actor.y, 60, TOLERANCE, 'midpoint y interpolation');
  if (Math.abs(Math.abs(actor.rotation) - Math.PI) > TOLERANCE) {
    throw new Error('Rotation interpolation did not take the shortest path across the angle boundary.');
  }

  interpolator.snapToCurrent(root);
  interpolator.render(root, 0);
  assertClose(actor.x, 110, TOLERANCE, 'pause snap to current transform');

  const pooledRoot = createDisplayObject();
  const pooledSprite = createDisplayObject(-500, 0, 0, false);
  pooledRoot.children.push(pooledSprite);
  interpolator.reset(pooledRoot);
  interpolator.beginStep(pooledRoot);
  pooledSprite.visible = true;
  pooledSprite.x = 300;
  interpolator.captureStep(pooledRoot);
  interpolator.render(pooledRoot, 0.25);
  assertClose(pooledSprite.x, 300, TOLERANCE, 'pooled sprite activation');

  return {
    midpointX: 105,
    midpointY: 60,
    shortestAnglePath: true,
    pauseSnap: true,
    pooledSpriteSpawn: true
  };
}

function createDisplayObject(x = 0, y = 0, rotation = 0, visible = true) {
  return {
    x,
    y,
    rotation,
    scale: { x: 1, y: 1 },
    visible,
    children: []
  };
}

function assertClose(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, received ${actual}.`);
  }
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function round(value) {
  return Number(value.toFixed(6));
}
