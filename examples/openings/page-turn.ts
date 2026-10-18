import { render } from "veena";
import { Scene, Timeline } from "veena/core";
import { Rectangle } from "veena/primitives";
import { Label } from "veena/text";
import { PageTurn } from "veena/storytelling";

interface PageStyle {
  background: string;
  panel: string;
  accent: string;
  text: string;
}

class BookPage extends Scene {
  constructor(
    readonly chapter: string,
    readonly subtitle: string,
    readonly pageStyle: PageStyle,
  ) {
    super({ width: 1280, height: 720, background: pageStyle.background });
  }

  override construct(): void {
    this.add(Rectangle().size([10.5, 5.4]).fill(this.pageStyle.panel).stroke({
      color: this.pageStyle.accent,
      width: 0.08,
    }));
    this.add(Label(this.chapter).height(0.72).color(this.pageStyle.accent), { at: [0, 0.6, 0.1] });
    this.add(Label(this.subtitle).height(0.3).color(this.pageStyle.text), { at: [0, -0.45, 0.1] });
    // Every nested page follows the parent clock, so keep it alive for the
    // complete multi-page demonstration.
    this.wait(10);
  }
}

class PageTurnExample extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#e7dfcc" });
  }

  override construct(): void {
    const pages = [
      new BookPage("CHAPTER ONE", "Warm paper · crimson ink", {
        background: "#efe5ce",
        panel: "#f7efd9",
        accent: "#9d2d28",
        text: "#3d352c",
      }),
      new BookPage("CHAPTER TWO", "Cool mist · teal ink", {
        background: "#dcebf1",
        panel: "#edf7f8",
        accent: "#17636d",
        text: "#263f46",
      }),
      new BookPage("CHAPTER THREE", "Midnight · golden ink", {
        background: "#20263e",
        panel: "#2d3450",
        accent: "#efbd56",
        text: "#f5efe2",
      }),
      new BookPage("CHAPTER FOUR", "Lavender · violet ink", {
        background: "#e5dcf2",
        panel: "#f2ecfa",
        accent: "#6a3f8f",
        text: "#41364a",
      }),
    ];
    const starts = [1, 3.1, 5.2];
    const timeline = new Timeline();

    pages.slice(0, -1).forEach((page, index) => {
      const turn = PageTurn(page, pages[index + 1]!)
        .direction("left")
        .timing({ duration: 1.25 })
        .addTo(this);
      const start = starts[index]!;

      // Later pairs stay hidden until their outgoing page becomes active.
      if (index > 0) {
        turn.incoming.opacity(0);
        turn.outgoing.opacity(0);
        timeline.animate([turn.incoming, turn.outgoing]).at(start).duration(0).appear();
      }
      turn.animate(timeline, { at: start });
    });

    this.play(timeline);
    this.wait(1.2);
  }
}

render(import.meta.url, PageTurnExample, { fps: 30 });
