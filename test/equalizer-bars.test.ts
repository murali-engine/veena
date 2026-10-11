import assert from "node:assert/strict";
import test from "node:test";
import { EqualizerBars } from "../src/tattvas/ai/equalizer-bars.ts";

test("equalizer bars interpolate named variable snapshots", () => {
  const equalizer = EqualizerBars([
    { id: "loss", label: "LOSS", min: 0, max: 2, value: 2 },
    { id: "accuracy", label: "ACC", value: 0.2 },
  ]).snapshot({ name: "trained", values: { loss: 0.2, accuracy: 0.9 } });

  const html = equalizer.contentHTML(0, {
    ...equalizer.initialState,
    morphProgress: 0.5,
  });

  assert.match(html, /data-equalizer-value="loss"[^>]*>1\.10</);
  assert.match(html, /data-equalizer-value="accuracy"[^>]*>0\.55</);
  assert.equal(equalizer.snapshotIndex("trained"), 1);
  assert.equal(equalizer.morphStageCount, 2);
});

test("equalizer snapshots are cumulative and clamp visual fill", () => {
  const equalizer = EqualizerBars([
    { id: "a", label: "A", value: 0.25 },
    { id: "b", label: "B", value: 0.5 },
  ], { segments: 5 })
    .snapshot({ name: "first", values: { a: 0.75 } })
    .snapshot({ name: "second", values: { b: 4 } });

  const html = equalizer.contentHTML(0, {
    ...equalizer.initialState,
    morphProgress: 2,
  });
  assert.match(html, /data-equalizer-value="a"[^>]*>0\.75</);
  assert.match(html, /data-equalizer-value="b"[^>]*>4\.00</);
  assert.match(html, /data-equalizer-fill="b" data-fill="1\.0000"/);
});

test("equalizer bars validate variables and snapshots", () => {
  assert.throws(() => EqualizerBars([]), /at least one variable/);
  assert.throws(() => EqualizerBars([
    { id: "x", label: "X" },
    { id: "x", label: "Again" },
  ]), /Duplicate equalizer variable/);
  const equalizer = EqualizerBars([{ id: "x", label: "X" }]);
  assert.throws(
    () => equalizer.snapshot({ name: "bad", values: { y: 1 } }),
    /Unknown equalizer variable/,
  );
});
