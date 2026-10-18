import { render } from "veena-engine";
import { Scene } from "veena-engine/core";
import { Label } from "veena-engine/text";
import { YouTubeSubscribe, YouTubeSubscribeSequence } from "veena-engine/composite";

class YouTubeSubscribeShort extends Scene {
  constructor() {
    super({ frame: "portrait", background: "#08080b" });
  }

  override construct(): void {
    this.add(
      Label("Stay curious.")
        .height(0.62)
        .color("#fafafa")
        .depthMode("overlay"),
      { at: [0, 2.5, 0] },
    );
    const subscribe = this.add(
      YouTubeSubscribe("Kavriq", {
        handle: "@kavriq",
        message: "Subscribe for the next story",
        layout: "compact",
      }),
      { at: [0, -0.2, 0] },
    );
    this.play(YouTubeSubscribeSequence(subscribe));
    this.wait(1.2);
  }
}

render(import.meta.url, YouTubeSubscribeShort, { fps: 30 });
