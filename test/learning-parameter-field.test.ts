import assert from "node:assert/strict";
import test from "node:test";
import {
  LearningParameterField,
  sampleLearningParameter,
} from "../src/tattvas/ai/learning-parameter-field.ts";

const sampling = { epochs: 100, seed: 7, noise: 0.3, settlingRate: 5 };

test("learning parameters change deterministically and settle exactly at the final epoch", () => {
  const parameter = { initial: -0.8, target: 0.42, min: -1, max: 1 };
  const early = sampleLearningParameter(parameter, 3, 12.5, sampling);
  const repeated = sampleLearningParameter(parameter, 3, 12.5, sampling);
  const late = sampleLearningParameter(parameter, 3, 94, sampling);
  const settled = sampleLearningParameter(parameter, 3, 100, sampling);

  assert.equal(early, repeated);
  assert.notEqual(early, late);
  assert.ok(Math.abs(late - parameter.target) < Math.abs(early - parameter.target));
  assert.equal(settled, parameter.target);
});

test("learning parameter fields support hundreds of bars and custom layouts", () => {
  const field = LearningParameterField(480, {
    epochs: 75,
    columns: 30,
    layout: (index, count) => [(index + 0.5) / count, index % 2 ? 0.7 : 0.3],
  });

  assert.equal(field.kind, "canvas");
  assert.equal(field.parameterCount, 480);
  assert.equal(field.epochs, 75);
  assert.deepEqual(field.positions[0], [0.5 / 480, 0.3]);
  assert.deepEqual(field.epochState(37.5), { epoch: 37.5 });
});

test("learning parameter fields validate counts, ranges, layouts, and epochs", () => {
  assert.throws(() => LearningParameterField(0), /positive integer/);
  assert.throws(() => LearningParameterField(10, { epochs: 0 }), /positive integer/);
  assert.throws(() => LearningParameterField(10, { range: [1, -1] }), /invalid/);
  assert.throws(
    () => LearningParameterField(10, { layout: () => [1.2, 0.5] }),
    /normalized 0\.\.1/,
  );
});
