import { Label, Scene, fontFile, render } from "veena-engine";

const TEST_FONT = fontFile(
  "Veena Test Pixel",
  "../../node_modules/playwright-core/lib/vite/traceViewer/codicon.DCmgc-ay.ttf",
  { weight: 400 },
);

class FontScene extends Scene {
  override construct(): void {
    this.registerFont(TEST_FONT);
    this.add(Label("Loaded font").height(0.6).font(TEST_FONT).fontWeight(400));
    this.wait(1);
  }
}

render(import.meta.url, FontScene);
