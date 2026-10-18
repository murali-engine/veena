import { render } from "veena-engine";
import { BiologicalNeuron, NeuralNetwork, neuralNetwork } from "veena-engine/ai";
import { Scene, Timeline } from "veena-engine/core";
import { palette } from "veena-engine/style";
import { Label } from "veena-engine/text";

const { GOLD_A, GRAY_B, GREEN_C, TEAL_C, WHITE } = palette;

/** A biological signal becomes a precise analogy for one artificial neuron. */
class BiologicalToAiNeuron extends Scene {
  constructor() {
    super({ viewWidth: 17 });
  }

  override construct(): void {
    const title = this.add(Label("From biological neuron to AI neuron")
      .height(0.4).color(WHITE).typewriter(), { at: [0, 3.15, 0] });
    const biologicalCaption = this.add(Label("Dendrites receive · soma integrates · axon forwards")
      .height(0.19).color(GRAY_B).typewriter(), { at: [-3.8, 2.45, 0] });
    const neuron = this.add(BiologicalNeuron({
      dendrites: 9,
      axonLength: 5.2,
      inputSignalColor: TEAL_C,
      signalColor: GOLD_A,
    }).scale(0.82), { at: [-3.25, 0.15, 0] });

    const aiCaption = this.add(Label("Inputs × weights → sum + bias → activation")
      .height(0.19).color(GRAY_B).typewriter(), { at: [4.55, 2.45, 0] });
    const model = neuralNetwork([
      { id: "input", label: "Inputs", nodes: ["x₁", "x₂", "x₃"] },
      { id: "neuron", label: "Σ(wx + b)", nodes: ["h"] },
      { id: "output", label: "Output", nodes: ["a"] },
    ], { layerSpacing: 2.2, nodeSpacing: 0.9, nodeRadius: 0.24 });
    const network = this.add(NeuralNetwork(model, {
      showValues: true,
      flow: GOLD_A,
      positive: GREEN_C,
      pulseRadius: 0.1,
    }).snapshot({
      name: "activated",
      nodes: {
        "input:x₁": { value: 0.8, activation: 0.8, emphasis: 1 },
        "input:x₂": { value: -0.2, activation: -0.2, emphasis: 1 },
        "input:x₃": { value: 0.5, activation: 0.5, emphasis: 1 },
        "neuron:h": { value: 1.1, activation: 1, emphasis: 1 },
        "output:a": { value: 0.75, activation: 0.75, emphasis: 1 },
      },
    }), { at: [4.55, 0.1, 0] });

    const distinction = this.add(Label("The AI neuron is a mathematical analogy—not a tiny biological cell.")
      .height(0.2).color(WHITE).typewriter(), { at: [0, -3.12, 0] });

    neuron.opacity(0);
    network.opacity(0);
    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(biologicalCaption).at(0.7).duration(1.2).ease("linear").typewrite();
    timeline.animate(neuron).at(1.2).duration(0.5).ease("outCubic").appear();
    timeline.animate(neuron).at(2).duration(1.4).ease("inOutCubic").to(neuron.receive());
    timeline.animate(neuron).at(3.2).duration(0.65).ease("outCubic").to(neuron.illuminate());
    timeline.animate(neuron).at(3.9).duration(1.8).ease("inOutCubic").to(neuron.fire());
    timeline.animate(aiCaption).at(5.5).duration(1.25).ease("linear").typewrite();
    timeline.animate(network).at(6).duration(0.5).ease("outCubic").appear();
    timeline.animate(network).at(6.45).duration(1.8).ease("inOutCubic").to({
      flowProgress: 1,
      morphProgress: network.snapshotIndex("activated"),
    });
    timeline.animate(distinction).at(8.25).duration(1.6).ease("linear").typewrite();
    this.play(timeline);
    if (this.duration < 10.5) this.wait(10.5 - this.duration);
  }
}

render(import.meta.url, BiologicalToAiNeuron);
