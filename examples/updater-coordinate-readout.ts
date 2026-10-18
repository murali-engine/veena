import { render } from "veena";
import { Scene, timeline } from "veena/core";
import { palette } from "veena/style";
import { Circle } from "veena/primitives";
import { Label } from "veena/text";

class UpdaterCoordinateReadout extends Scene {
  override construct(): void {
    const ball = this.add(
      Circle().radius(0.42).fill(palette.TEAL_C),
      { at: [-5, -1.2, 0] },
    );
    const coordinates = this.add(
      Label("x=-5.00  y=-1.20")
        .height(0.24)
        .reserveText("x=-00.00  y=-00.00")
        .color(palette.GRAY_A),
      { at: [-5, -0.45, 0] },
    );

    this.addUpdater(ball, ({ state, stateOf }) => {
      const readout = stateOf(coordinates);
      if (!readout) return;
      readout.x = state.x;
      readout.y = state.y + 0.75;
      readout.text = `x=${state.x.toFixed(2)}  y=${state.y.toFixed(2)}`;
    });

    this.play(timeline((local) => {
      local.animate(ball).duration(4).ease("inOutCubic").moveTo([5, 1.2, 0]);
    }));
    this.wait(0.5);
  }
}

render(import.meta.url, UpdaterCoordinateReadout);
