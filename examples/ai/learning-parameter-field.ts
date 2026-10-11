import { render } from "murali-js";
import { LearningParameterField } from "murali-js/ai";
import { Scene, Timeline, type Vec2 } from "murali-js/core";

const PARAMETERS_PER_BANK = 120;
const BANK_COLUMNS = 12;
const BANK_ROWS = 10;

class LearningParameterFieldExample extends Scene {
  override construct(): void {
    const parameters = this.add(LearningParameterField(PARAMETERS_PER_BANK * 3, {
      epochs: 120,
      seed: 17,
      size: [12.8, 5.6],
      columns: 36,
      title: "PARAMETER LEARNING",
      noise: 0.3,
      settlingRate: 4.8,
      layout: parameterBanks,
      barColor: "rgba(112, 145, 151, 0.9)",
    }));

    const timeline = new Timeline();
    timeline.animate(parameters).duration(12).ease("linear")
      .to(parameters.epochState(parameters.epochs));
    this.play(timeline);
    this.wait(0.5);
    this.captureScreenshotsNamed([
      [1.8, "parameter-learning-early.png"],
      [6, "parameter-learning-mid.png"],
      [12, "parameter-learning-settled.png"],
    ]);
  }
}

/** Three independently arranged parameter matrices, like successive model layers. */
function parameterBanks(index: number): Vec2 {
  const bank = Math.floor(index / PARAMETERS_PER_BANK);
  const local = index % PARAMETERS_PER_BANK;
  const column = local % BANK_COLUMNS;
  const row = Math.floor(local / BANK_COLUMNS);
  const bankWidth = 0.27;
  const bankGap = 0.065;
  const left = 0.03 + bank * (bankWidth + bankGap);
  return [
    left + (column + 0.5) / BANK_COLUMNS * bankWidth,
    0.04 + (row + 0.5) / BANK_ROWS * 0.92,
  ];
}

render(import.meta.url, LearningParameterFieldExample, {
  output: "./output/learning-parameter-field.mp4",
  fps: 60,
});
