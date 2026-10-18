import { render } from "veena";
import { Scene, timeline } from "veena/core";
import { Label } from "veena/text";
import { YouTubeSubscribe, YouTubeSubscribeSequence } from "veena/composite";

class YouTubeSubscribeScene extends Scene {
  constructor() {
    super({ background: "#08080b" });
  }

  override construct(): void {
    const heading = this.add(
      Label("Enjoyed the story?")
        .height(0.58)
        .color("#fafafa")
        .depthMode("overlay"),
      { at: [0, 1.7, 0] },
    );
    const subscribe = this.add(
      YouTubeSubscribe("Kavriq", {
        handle: "@kavriq",
        message: "More visual stories every week",
      }),
      { at: [0, -0.2, 0] },
    );

    this.play(YouTubeSubscribeSequence(subscribe));
    this.wait(1.2);
    this.play(timeline((local) => {
      local.animate([heading, subscribe]).duration(0.45).disappear();
    }));
  }
}

render(import.meta.url, YouTubeSubscribeScene, { fps: 30 });
