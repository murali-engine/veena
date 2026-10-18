import { render } from "veena-engine";
import { EqualizerBars } from "veena-engine/ai";
import { Scene, Timeline } from "veena-engine/core";

class EqualizerBarsExample extends Scene {
  override construct(): void {
    const signals = EqualizerBars([
      { id: "loss", label: "LOSS", min: 0, max: 2.5, value: 2.2, digits: 2 },
      { id: "accuracy", label: "ACC", min: 0, max: 100, value: 18, unit: "%", digits: 0 },
      { id: "gradient", label: "GRAD", min: 0, max: 1.2, value: 1.05, digits: 2 },
      { id: "confidence", label: "CONF", min: 0, max: 1, value: 0.12, digits: 2 },
    ], {
      title: "TRAINING SIGNALS",
      segments: 14,
      background: "rgba(8, 11, 18, 0.88)",
    })
      .snapshot({
        name: "learning",
        values: { loss: 0.9, accuracy: 63, gradient: 0.55, confidence: 0.58 },
      })
      .snapshot({
        name: "converged",
        values: { loss: 0.18, accuracy: 92, gradient: 0.12, confidence: 0.91 },
      });

    const equalizer = this.add(signals);
    const timeline = new Timeline();
    timeline.animate(equalizer).duration(3).ease("inOutCubic")
      .to({ morphProgress: signals.snapshotIndex("learning") });
    timeline.animate(equalizer).at(3.35).duration(3).ease("inOutCubic")
      .to({ morphProgress: signals.snapshotIndex("converged") });
    this.play(timeline);
    this.wait(0.5);
    this.captureScreenshotsNamed([[5.8, "equalizer-bars.png"]]);
  }
}

render(import.meta.url, EqualizerBarsExample, {
  output: "./output/equalizer-bars.mp4",
  fps: 60,
});
