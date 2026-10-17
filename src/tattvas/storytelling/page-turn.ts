import type { Scene } from "../../core/Scene.ts";
import { SceneView, type SceneViewTattva } from "../../core/SceneView.ts";
import { Tattva } from "../../core/Tattva.ts";
import type { Timeline } from "../../core/Timeline.ts";

export type PageTurnDirection = "left" | "right";

export interface PageTurnStyle {
  /** Edge the page travels toward. */
  direction: PageTurnDirection;
  /** Width of the highlighted curl in scene units. */
  curlWidth: number;
  /** Opaque color on the reverse side of the turning page. Defaults to the outgoing scene background. */
  paperColor?: string;
  /** Maximum shadow blur in pixels at the halfway fold. */
  shadowBlur: number;
  /** Maximum shadow opacity at the halfway fold. */
  shadowOpacity: number;
}

export interface PageTurnTiming {
  duration: number;
}

export interface PageTurnAnimationOptions {
  at?: number;
}

const DEFAULT_STYLE: PageTurnStyle = {
  direction: "left",
  curlWidth: 0.58,
  shadowBlur: 18,
  shadowOpacity: 0.3,
};

const DEFAULT_TIMING: PageTurnTiming = {
  duration: 1.15,
};

/**
 * A Kindle-style full-frame page turn. Both scenes stay fixed in place while
 * the outgoing surface wraps away behind a moving fold to expose the page below.
 */
export function PageTurn(outgoing: Scene, incoming: Scene): PageTurnBuilder {
  return new PageTurnBuilder(outgoing, incoming);
}

export class PageTurnBuilder {
  private styleValue: PageTurnStyle = { ...DEFAULT_STYLE };
  private timingValue: PageTurnTiming = { ...DEFAULT_TIMING };
  private resolutionValue?: readonly [number, number];

  constructor(
    readonly outgoingScene: Scene,
    readonly incomingScene: Scene,
  ) {}

  direction(value: PageTurnDirection): this {
    this.styleValue = { ...this.styleValue, direction: value };
    return this;
  }

  style(value: Partial<PageTurnStyle>): this {
    this.styleValue = { ...this.styleValue, ...value };
    return this;
  }

  timing(value: Partial<PageTurnTiming>): this {
    this.timingValue = { ...this.timingValue, ...value };
    return this;
  }

  /** Offscreen pixel resolution used for both nested scenes. */
  resolution(width: number, height: number): this {
    positive(width, "Page turn resolution width");
    positive(height, "Page turn resolution height");
    this.resolutionValue = [Math.floor(width), Math.floor(height)];
    return this;
  }

  duration(): number {
    this.validate();
    return this.timingValue.duration;
  }

  addTo(scene: Scene): PageTurnComposition {
    this.validate();
    const style = { ...this.styleValue };
    const duration = this.timingValue.duration;
    const [pixelWidth, pixelHeight] = this.resolutionValue ?? [scene.width, scene.height];
    const travel = style.direction === "left" ? -1 : 1;
    const edgeStartX = -travel * scene.viewWidth / 2;

    const incoming = SceneView(this.incomingScene)
      .size(scene.viewWidth, scene.viewHeight)
      .resolution(pixelWidth, pixelHeight)
      .background(this.incomingScene.background)
      .playback("once")
      .depthMode("overlay")
      .layer(0);
    const outgoing = SceneView(this.outgoingScene)
      .size(scene.viewWidth, scene.viewHeight)
      .resolution(pixelWidth, pixelHeight)
      .background(this.outgoingScene.background)
      .playback("once")
      .depthMode("overlay")
      .layer(1)
      .css({
        clipPath: pageClip(style.direction, "start"),
        willChange: "clip-path",
      });
    const fold = new Tattva({
      css: {
        background: foldGradient(style, style.paperColor ?? this.outgoingScene.background),
        borderRadius: style.direction === "left" ? "48% 14% 14% 48%" : "14% 48% 48% 14%",
        boxShadow: foldShadow(style),
        filter: `blur(${Math.max(0.5, style.shadowBlur * 0.045)}px)`,
        willChange: "transform, opacity",
      },
      state: { opacity: 0, scaleX: 0.2 },
    });
    fold.worldSize = { width: style.curlWidth, height: scene.viewHeight * 1.08 };
    fold.at([edgeStartX, 0, 0]).depthMode("overlay").layer(2);

    scene.add(incoming, outgoing, fold);
    return new PageTurnComposition(outgoing, incoming, fold, style, duration, scene.viewWidth);
  }

  private validate(): void {
    if (this.styleValue.direction !== "left" && this.styleValue.direction !== "right") {
      throw new Error(`Page turn direction must be left or right; received ${JSON.stringify(this.styleValue.direction)}.`);
    }
    positive(this.styleValue.curlWidth, "Page turn curl width");
    nonnegative(this.styleValue.shadowBlur, "Page turn shadow blur");
    if (!Number.isFinite(this.styleValue.shadowOpacity)
      || this.styleValue.shadowOpacity < 0
      || this.styleValue.shadowOpacity > 1) {
      throw new Error(`Page turn shadow opacity must be between 0 and 1; received ${this.styleValue.shadowOpacity}.`);
    }
    positive(this.timingValue.duration, "Page turn duration");
  }
}

export class PageTurnComposition {
  readonly duration: number;

  constructor(
    readonly outgoing: SceneViewTattva,
    readonly incoming: SceneViewTattva,
    readonly fold: Tattva,
    private readonly style: PageTurnStyle,
    duration: number,
    private readonly viewWidth: number,
  ) {
    this.duration = duration;
  }

  all(): readonly [SceneViewTattva, SceneViewTattva, Tattva] {
    return [this.outgoing, this.incoming, this.fold];
  }

  animate(timeline: Timeline, options: PageTurnAnimationOptions = {}): this {
    const at = nonnegative(options.at ?? 0, "Page turn animation start");
    const half = this.duration / 2;
    const travel = this.style.direction === "left" ? -1 : 1;
    const edgeStartX = -travel * this.viewWidth / 2;
    const edgeEndX = travel * this.viewWidth / 2;
    const edgeMiddleX = travel * this.viewWidth * 0.01;

    timeline.animate(this.outgoing)
      .at(at)
      .duration(half)
      .ease("inOutSine")
      .setStyle({ clipPath: pageClip(this.style.direction, "middle") });
    timeline.animate(this.outgoing)
      .at(at + half)
      .duration(half)
      .ease("inOutSine")
      .setStyle({ clipPath: pageClip(this.style.direction, "end") });
    timeline.animate(this.fold)
      .at(at)
      .duration(half)
      .ease("inOutSine")
      .to({ x: edgeMiddleX, scaleX: 1 });
    timeline.animate(this.fold)
      .at(at + half)
      .duration(half)
      .ease("inOutSine")
      .to({ x: edgeEndX, scaleX: 0.2 });
    timeline.animate(this.fold)
      .at(at)
      .duration(this.duration * 0.12)
      .ease("outSine")
      .to({ opacity: 1 });
    timeline.animate(this.fold)
      .at(at + this.duration * 0.82)
      .duration(this.duration * 0.18)
      .ease("inSine")
      .to({ opacity: 0 });
    this.fold.set({ x: edgeStartX });
    return this;
  }
}

function pageClip(direction: PageTurnDirection, phase: "start" | "middle" | "end"): string {
  if (direction === "left") {
    const edge = phase === "start" ? [100, 100, 100, 100, 100]
      : phase === "middle" ? [52, 50, 49, 50, 52]
      : [-2, -2, -2, -2, -2];
    return `polygon(0% 0%, ${edge[0]}% 0%, ${edge[1]}% 20%, ${edge[2]}% 50%, ${edge[3]}% 80%, ${edge[4]}% 100%, 0% 100%)`;
  }
  const edge = phase === "start" ? [0, 0, 0, 0, 0]
    : phase === "middle" ? [48, 50, 51, 50, 48]
    : [102, 102, 102, 102, 102];
  return `polygon(${edge[0]}% 0%, 100% 0%, 100% 100%, ${edge[4]}% 100%, ${edge[3]}% 80%, ${edge[2]}% 50%, ${edge[1]}% 20%)`;
}

function foldGradient(style: PageTurnStyle, paperColor: string): string {
  const angle = style.direction === "left" ? 90 : 270;
  const shadow = Math.min(0.42, style.shadowOpacity);
  return `linear-gradient(${angle}deg, rgba(0, 0, 0, ${shadow}) 0%, rgba(255, 255, 255, 0.2) 42%, rgba(255, 255, 255, 0.04) 72%, rgba(0, 0, 0, 0.06) 100%), ${paperColor}`;
}

function foldShadow(style: PageTurnStyle): string {
  const sign = style.direction === "left" ? 1 : -1;
  return `${sign * style.shadowBlur * 0.28}px 0px ${style.shadowBlur}px rgba(0, 0, 0, ${style.shadowOpacity})`;
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive; received ${value}.`);
  return value;
}

function nonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be nonnegative; received ${value}.`);
  return value;
}
