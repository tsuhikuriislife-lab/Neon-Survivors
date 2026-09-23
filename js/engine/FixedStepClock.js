const DEFAULT_STEP_SECONDS = 1 / 60;
const DEFAULT_MAX_FRAME_DELTA_SECONDS = 0.1;
const DEFAULT_MAX_STEPS_PER_FRAME = 6;
const ACCUMULATOR_EPSILON = 1e-9;

/**
 * Accumulates elapsed time and invokes updates at a stable simulation rate.
 * The clock owns no game state, so it can also be driven by synthetic timestamps.
 */
export class FixedStepClock {
  constructor(
    stepSeconds = DEFAULT_STEP_SECONDS,
    maxFrameDeltaSeconds = DEFAULT_MAX_FRAME_DELTA_SECONDS,
    maxStepsPerFrame = DEFAULT_MAX_STEPS_PER_FRAME
  ) {
    this.stepSeconds = stepSeconds;
    this.maxFrameDeltaSeconds = maxFrameDeltaSeconds;
    this.maxStepsPerFrame = maxStepsPerFrame;
    this.accumulator = 0;
  }

  advance(frameDelta, updateStep) {
    const elapsed = Math.max(0, Math.min(this.maxFrameDeltaSeconds, frameDelta));
    this.accumulator = Math.min(this.maxFrameDeltaSeconds, this.accumulator + elapsed);

    let steps = 0;
    while (
      this.accumulator + ACCUMULATOR_EPSILON >= this.stepSeconds &&
      steps < this.maxStepsPerFrame
    ) {
      const shouldContinue = updateStep(this.stepSeconds);
      this.accumulator = Math.max(0, this.accumulator - this.stepSeconds);
      steps++;

      if (shouldContinue === false) {
        this.reset();
        break;
      }
    }

    return steps;
  }

  reset() {
    this.accumulator = 0;
  }

  get alpha() {
    return this.accumulator / this.stepSeconds;
  }
}
