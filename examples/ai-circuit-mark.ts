import { AICircuitMark } from "veena-engine/ai";
import { Scene } from "veena-engine/core";
import { render } from "veena-engine";

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
