import assert from "node:assert/strict";
import test from "node:test";
import { BiologicalNeuron } from "../src/tattvas/ai/biological-neuron.ts";

test("biological neurons expose typed teaching phases and deterministic anatomy", () => {
  const neuron = BiologicalNeuron({ dendrites: 7, axonLength: 4.6, myelinated: true });

  assert.equal(neuron.dendriteCount, 7);
  assert.equal(neuron.axonLength, 4.6);
  assert.equal(neuron.myelinated, true);
  assert.deepEqual(neuron.receive(0.6), { inputProgress: 0.6 });
  assert.deepEqual(neuron.illuminate(), { charge: 1 });
  assert.deepEqual(neuron.fire(0.75), { signalProgress: 0.75 });

  const markup = neuron.contentHTML(0, {
    ...neuron.initialState,
    inputProgress: 0.5,
    charge: 0.8,
    signalProgress: 0.65,
  });
  assert.equal((markup.match(/data-neuron-part="dendrite"/g) ?? []).length, 7);
  assert.equal((markup.match(/data-neuron-part="input-pulse"/g) ?? []).length, 7);
  assert.equal((markup.match(/data-neuron-part="myelin"/g) ?? []).length, 6);
  assert.match(markup, /data-neuron-part="soma-glow"/);
  assert.match(markup, /data-neuron-part="axon-pulse"/);
  assert.match(markup, /data-neuron-part="signal-trail"/);
});

test("biological neurons light terminals only when the outgoing pulse arrives", () => {
  const neuron = BiologicalNeuron({ myelinated: false });
  const idle = neuron.contentHTML();
  const fired = neuron.contentHTML(0, { ...neuron.initialState, signalProgress: 1 });

  assert.doesNotMatch(idle, /data-neuron-part="myelin"/);
  assert.doesNotMatch(idle, /data-neuron-part="axon-pulse"/);
  assert.match(fired, /data-neuron-part="axon-pulse"/);
  assert.match(fired, /data-neuron-part="terminal-button"/);
});

test("biological neuron options and state helpers validate their domains", () => {
  assert.throws(() => BiologicalNeuron({ dendrites: 2 }), /integer from 3 to 18/);
  assert.throws(() => BiologicalNeuron({ axonLength: 0 }), /must be positive/);
  const neuron = BiologicalNeuron();
  assert.throws(() => neuron.receive(1.1), /between 0 and 1/);
  assert.throws(() => neuron.illuminate(-0.1), /between 0 and 1/);
  assert.throws(() => neuron.fire(Number.NaN), /between 0 and 1/);
});
