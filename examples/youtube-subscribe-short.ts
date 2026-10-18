import { render } from "veena";
import { Scene } from "veena/core";
import { Label } from "veena/text";
import { YouTubeSubscribe, YouTubeSubscribeSequence } from "veena/composite";

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
