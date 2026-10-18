import { render } from "veena-engine";
import { Scene, Timeline } from "veena-engine/core";
import { palette } from "veena-engine/style";
import { Label } from "veena-engine/text";
import { WordCloud } from "veena-engine/maths";
const { WHITE } = palette;

const EDITORIAL_COLORS = ["#dce2ea", "#aab4c3", "#78a9a2", "#7f94b2", "#9d8fa8"];

const FEATURED_WORDS = [
  ["AI", 100],
  ["Machine Learning", 94],
  ["Deep Learning", 90],
  ["Neural Network", 86],
  ["Foundation Model", 82],
  ["LLM", 78],
  ["Generative AI", 96],
] as const;

const FILLER_WORDS = [
  ["chatbots", 52], ["assistants", 50], ["generated images", 48], ["automation", 46],
  ["deepfakes", 44], ["new models", 42], ["transformers", 40], ["training", 38],
  ["inference", 36], ["tokens", 34], ["multimodal", 32], ["agents", 30],
  ["reasoning", 28], ["synthetic media", 26], ["embeddings", 24], ["context", 22],
  ["prompting", 20], ["alignment", 18], ["compute", 16], ["data", 14],
] as const;

class WordCloudScene extends Scene {
  override construct(): void {
    const title = this.add(Label("The language of AI").height(0.42).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.55 });
    const cloud = this.add(WordCloud([
      ...FEATURED_WORDS.map(([text, weight]) => ({
        text,
        weight,
        featured: true,
        orientation: "horizontal" as const,
      })),
      ...FILLER_WORDS.map(([text, weight]) => ({ text, weight })),
    ], {
      minimumWordSize: 0.3,
      maximumWordSize: 1,
      colors: EDITORIAL_COLORS,
    })
      .size([13.5, 6.3])
      .shape("ellipse")
      .padding(0.07)
      .seed(2026), { at: [0, 0.1, 0] });

    const timeline = new Timeline();
    timeline.animate(title).duration(0.8).ease("linear").typewrite();
    cloud.animate(timeline, {
      at: 0.45,
      featuredStagger: 0.22,
      featuredDuration: 0.55,
      pause: 1.25,
      fillerStagger: 0.045,
      fillerDuration: 0.4,
      hold: 1.4,
      exitStagger: 0.018,
      exitDuration: 0.45,
    });
    this.play(timeline);
  }
}

render(import.meta.url, WordCloudScene);
