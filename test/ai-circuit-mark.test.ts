import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_CIRCUIT_BLUE,
  AI_CIRCUIT_GOLD,
  AICircuitMark,
  AICircuitPulse,
} from "../src/tattvas/ai/ai-circuit-mark.ts";

test("builds the AI circuit mark with scalable vector layers", () => {
  const mark = AICircuitMark({ size: 9 });

  assert.equal(mark.nodes.length, 32);
  assert.ok(mark.nodes.every((node) => node.initialState.opacity === 1));
  assert.ok(mark.nodes.every((node) => {
    const radius = (node.worldSize?.width ?? 0) / 2;
    return Math.hypot(node.initialState.x, node.initialState.y) + radius < 2.78;
  }), "every terminal keeps visible clearance from the 3.02-radius outer ring");
  const chipEdge = (mark.chip.worldSize?.width ?? 0) / 2 + (mark.chip.worldStrokeWidth ?? 0) / 2;
  assert.ok(1.24 - chipEdge > 0.05, "floating contacts keep a visible gap from the AI block");
  assert.equal(mark.traces.initialState.color, AI_CIRCUIT_BLUE);
  assert.equal(mark.label.initialState.color, AI_CIRCUIT_GOLD);
  assert.ok(Math.abs((mark.worldSize?.width ?? 0) * mark.initialState.scaleX - 9) < 1e-9);
  assert.match(mark.traces.contentHTML() ?? "", /data-murali-path/);
});

test("authors a deterministic seamless activity pulse", () => {
  const mark = AICircuitMark();
  const pulse = AICircuitPulse(mark);
  const tattvas = [mark.halo, mark.core, ...mark.nodes];
  const states = new Map(tattvas.map((tattva) => [tattva, { ...tattva.initialState }]));

  pulse.update(0.8, states);
  const first = tattvas.map((tattva) => ({ ...states.get(tattva)! }));
  pulse.update(0.8 + pulse.duration, states);
  const looped = tattvas.map((tattva) => ({ ...states.get(tattva)! }));

  assert.deepEqual(looped, first);
  assert.ok(mark.nodes.some((node) => (states.get(node)?.scaleX ?? 1) > 1));
});

test("supports a custom label and validates dimensions", () => {
  assert.equal(AICircuitMark({ label: "ML", halo: false }).label.initialState.text, "ML");
  assert.equal(AICircuitMark({ halo: false }).halo.initialState.opacity, 0);
  assert.throws(() => AICircuitMark({ size: 0 }), /positive finite number/);
  assert.throws(() => AICircuitPulse(AICircuitMark(), { duration: -1 }), /positive finite number/);
});
