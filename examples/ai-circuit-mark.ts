import { AICircuitMark } from "murali-js/ai";
import { Scene } from "murali-js/core";
import { render } from "murali-js";

class AICircuitMarkExample extends Scene {
  constructor() {
    super({ frame: "square", background: "#fffdf8" });
  }

  override construct(): void {
    this.add(AICircuitMark({ size: 6.8 }));
  }
}

render(import.meta.url, AICircuitMarkExample, {
  output: "./output/ai-circuit-mark.png",
});
