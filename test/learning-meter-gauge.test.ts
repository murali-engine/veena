import assert from "node:assert/strict";
import test from "node:test";
import { LearningMeterGaugeField } from "../src/tattvas/ai/learning-meter-gauge.ts";

test("learning meter fields create dense configurable gauge layouts", () => {
  const meters = LearningMeterGaugeField(240, {
    epochs: 80,
    columns: 24,
    layout: (index, count) => [(index + 0.5) / count, index % 2 ? 0.75 : 0.25],
  });

  assert.equal(meters.kind, "canvas");
  assert.equal(meters.parameterCount, 240);
  assert.equal(meters.epochs, 80);
  assert.deepEqual(meters.positions[0], [0.5 / 240, 0.25]);
  assert.deepEqual(meters.epochState(31.5), { epoch: 31.5 });
});

test("learning meter fields accept real endpoints and validate layout", () => {
  const meters = LearningMeterGaugeField([
    { id: "weight", initial: -0.9, target: 0.35 },
    { id: "bias", initial: 0.7, target: -0.1 },
  ], { epochs: 20, background: null });
  assert.equal(meters.parameterCount, 2);
  assert.throws(
    () => LearningMeterGaugeField(4, { layout: () => [-0.1, 0.5] }),
    /normalized 0\.\.1/,
  );
  assert.throws(() => LearningMeterGaugeField(4, { ticks: 0 }), /positive integer/);
});
