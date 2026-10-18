import { render } from "veena-engine";
import { KavriqLogoMark } from "veena-engine/composite";
import { Scene } from "veena-engine/core";

abstract class MonochromeKavriqLogo extends Scene {
  protected constructor(color: string) {
    super({ frame: "square", width: 1200, height: 1200 });
    this.color = color;
  }

  private readonly color: string;

  override construct(): void {
    this.add(KavriqLogoMark({
      height: 5.25,
      color: this.color,
      shadow: false,
    }));
  }
}

class WhiteKavriqLogo extends MonochromeKavriqLogo {
  constructor() {
    super("#ffffff");
  }
}

class BlackKavriqLogo extends MonochromeKavriqLogo {
  constructor() {
    super("#000000");
  }
}

await render(import.meta.url, WhiteKavriqLogo, {
  output: "./output/kavriq-logo-white.png",
  format: "png",
  transparent: true,
  at: 0,
});

await render(import.meta.url, BlackKavriqLogo, {
  output: "./output/kavriq-logo-black.png",
  format: "png",
  transparent: true,
  at: 0,
});
