import { render } from "veena-engine";
import { VeenaLogoMark, VeenaLogoSwell } from "veena-engine/composite";
import { Scene } from "veena-engine/core";

/**
 * The settled mark rides one musical phrase.
 * Blue lifts from the baseline on the low swell, violet nudges after it,
 * and coral swells ahead of them. The rise and the return both ease,
 * and the phrase closes on the same breath it opens on.
 */
class VeenaLogoAnimation extends Scene {
  constructor() {
    super({ frame: "square", background: "#f7f4ed" });
  }

  override construct(): void {
    const mark = this.add(VeenaLogoMark({ width: 6.6 }));
    const swell = VeenaLogoSwell(mark);
    this.updater(swell.update);
    this.wait(swell.duration);
  }
}

render(import.meta.url, VeenaLogoAnimation, {
  output: "./output/veena-logo-animation.webm",
  transparent: true,
});
