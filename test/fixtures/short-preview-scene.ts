import { Circle, Scene, render } from "veena-engine";

class ShortPreviewScene extends Scene {
  override construct(): void {
    this.add(Circle().radius(0.4));
    this.wait(0.05);
  }
}

render(import.meta.url, ShortPreviewScene);
