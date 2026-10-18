import { render } from "veena-engine";
import { LearningMeterGaugeField } from "veena-engine/ai";
import { Scene, Timeline } from "veena-engine/core";

class LearningMeterGaugesExample extends Scene {
  override construct(): void {
    const meters = this.add(LearningMeterGaugeField(180, {
      epochs: 100,
      seed: 23,
      size: [13.5, 6.2],
      columns: 18,
      title: "MODEL PARAMETERS",
      noise: 0.24,
      settlingRate: 5,
      gaugeScale: 0.88,
      arcColor: "rgba(174, 181, 181, 0.46)",
      needleColor: "rgba(83, 116, 120, 0.84)",
      // The component remains transparent unless `background` is supplied.
    }));

    const timeline = new Timeline();
    timeline.animate(meters).duration(10).ease("linear")
      .to(meters.epochState(meters.epochs));
    this.play(timeline);
    this.wait(0.5);
    this.captureScreenshotsNamed([
      [1.5, "learning-meters-early.png"],
      [5, "learning-meters-mid.png"],
      [10, "learning-meters-settled.png"],
    ]);
  }
}

render(import.meta.url, LearningMeterGaugesExample, {
  output: "./output/learning-meter-gauges.mp4",
  fps: 60,
});
