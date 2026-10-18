import { render } from "veena";
import { KAVRIQ_BACKGROUND, KavriqLogoMark } from "veena/composite";
import { Scene } from "veena/core";

/** Export the simple Kavriq water-drop mark with and without its showcase background. */
class KavriqLogoImage extends Scene {
  constructor() {
    super({ frame: "square", width: 1200, height: 1200, background: KAVRIQ_BACKGROUND });
  }

  override construct(): void {
    this.add(KavriqLogoMark({ height: 5.25 }));
  }
}

await render(import.meta.url, KavriqLogoImage, {
  output: "./output/kavriq-logo.png",
  format: "png",
  transparent: true,
  at: 0,
});

await render(import.meta.url, KavriqLogoImage, {
  output: "./output/kavriq-logo-background.png",
  format: "png",
  transparent: false,
  at: 0,
});
