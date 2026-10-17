import { Tattva, type TattvaState, type Vec2 } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themeColor,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";

export interface BiologicalNeuronOptions {
  /** Number of primary dendrites. Defaults to 9. */
  readonly dendrites?: number;
  /** Length of the axon in world units. Defaults to 5.2. */
  readonly axonLength?: number;
  /** Draw separated myelin sheaths around the axon. Defaults to true. */
  readonly myelinated?: boolean;
  readonly membraneColor?: ColorInput;
  readonly cellColor?: ColorInput;
  readonly nucleusColor?: ColorInput;
  readonly myelinColor?: ColorInput;
  readonly inputSignalColor?: ColorInput;
  readonly signalColor?: ColorInput;
}

export interface BiologicalNeuronState extends TattvaState {
  /** Progress of input pulses from dendrite tips toward the soma. */
  inputProgress: number;
  /** Accumulated soma activity. At 1 the soma is fully illuminated. */
  charge: number;
  /** Progress of the outgoing action-potential metaphor along the axon. */
  signalProgress: number;
}

interface NeuronColors {
  membrane: string;
  cell: string;
  nucleus: string;
  myelin: string;
  inputSignal: string;
  signal: string;
}

interface DendriteGeometry {
  readonly start: Vec2;
  readonly controlA: Vec2;
  readonly controlB: Vec2;
  readonly end: Vec2;
  readonly twigs: readonly (readonly [Vec2, Vec2])[];
}

const SOMA: Vec2 = [-1.35, 0];
const SOMA_RADIUS = 0.58;
const VIEW_TOP = -2.55;
const VIEW_HEIGHT = 5.1;

/** A stylised biological neuron with separately animatable input, charge, and output phases. */
export function BiologicalNeuron(options: BiologicalNeuronOptions = {}): BiologicalNeuronTattva {
  return new BiologicalNeuronTattva(options);
}

export class BiologicalNeuronTattva extends Tattva<BiologicalNeuronState> {
  readonly dendriteCount: number;
  readonly axonLength: number;
  readonly myelinated: boolean;

  private readonly dendriteGeometry: readonly DendriteGeometry[];
  private readonly axonEndX: number;
  private readonly colorInputs: {
    readonly membrane: ColorInput;
    readonly cell: ColorInput;
    readonly nucleus: ColorInput;
    readonly myelin: ColorInput;
    readonly inputSignal: ColorInput;
    readonly signal: ColorInput;
  };
  private colors!: NeuronColors;

  constructor(options: BiologicalNeuronOptions = {}) {
    super({ state: { inputProgress: 0, charge: 0, signalProgress: 0 } });
    this.dendriteCount = integerInRange(options.dendrites ?? 9, "BiologicalNeuron dendrites", 3, 18);
    this.axonLength = positive(options.axonLength ?? 5.2, "BiologicalNeuron axon length");
    this.myelinated = options.myelinated ?? true;
    this.axonEndX = SOMA[0] + SOMA_RADIUS * 0.78 + this.axonLength;
    this.dendriteGeometry = dendrites(this.dendriteCount);
    this.colorInputs = {
      membrane: options.membraneColor ?? themeColor("stroke"),
      cell: options.cellColor ?? themeColor("surfaceElevated"),
      nucleus: options.nucleusColor ?? themeColor("accentAlt"),
      myelin: options.myelinColor ?? themeColor("textSecondary"),
      inputSignal: options.inputSignalColor ?? themeColor("accent"),
      signal: options.signalColor ?? themeColor("warning"),
    };
    this.dynamicGeometry = true;
    this.worldStrokeWidth = 0.07;
    this.worldSize = { width: this.axonEndX + 4.72, height: VIEW_HEIGHT };
    this.resolveColors(this.resolvedTheme);
  }

  /** State fragment for a pulse arriving through every dendrite. */
  receive(progress = 1): Partial<BiologicalNeuronState> {
    return { inputProgress: unit(progress, "BiologicalNeuron input progress") };
  }

  /** State fragment for illuminating the soma. */
  illuminate(charge = 1): Partial<BiologicalNeuronState> {
    return { charge: unit(charge, "BiologicalNeuron charge") };
  }

  /** State fragment for forwarding a pulse through the axon. */
  fire(progress = 1): Partial<BiologicalNeuronState> {
    return { signalProgress: unit(progress, "BiologicalNeuron signal progress") };
  }

  override contentHTML(
    _time = 0,
    state: Readonly<BiologicalNeuronState> = this.initialState,
  ): string {
    return neuronMarkup({
      id: this.id,
      dendrites: this.dendriteGeometry,
      axonEndX: this.axonEndX,
      myelinated: this.myelinated,
      colors: this.colors,
      inputProgress: clamp01(state.inputProgress),
      charge: clamp01(state.charge),
      signalProgress: clamp01(state.signalProgress),
      width: this.worldSize!.width,
    });
  }

  protected override onThemeResolved(theme: Theme): void {
    this.resolveColors(theme);
  }

  private resolveColors(theme: Theme): void {
    this.colors = {
      membrane: resolveColorInput(this.colorInputs.membrane, theme),
      cell: resolveColorInput(this.colorInputs.cell, theme),
      nucleus: resolveColorInput(this.colorInputs.nucleus, theme),
      myelin: resolveColorInput(this.colorInputs.myelin, theme),
      inputSignal: resolveColorInput(this.colorInputs.inputSignal, theme),
      signal: resolveColorInput(this.colorInputs.signal, theme),
    };
  }
}

interface NeuronMarkupInput {
  readonly id: string;
  readonly dendrites: readonly DendriteGeometry[];
  readonly axonEndX: number;
  readonly myelinated: boolean;
  readonly colors: NeuronColors;
  readonly inputProgress: number;
  readonly charge: number;
  readonly signalProgress: number;
  readonly width: number;
}

function neuronMarkup(input: NeuronMarkupInput): string {
  const left = -4.72;
  const axonStart: Vec2 = [SOMA[0] + SOMA_RADIUS * 0.72, 0.04];
  const axonControlA: Vec2 = [SOMA[0] + 1.55, 0.34];
  const axonControlB: Vec2 = [input.axonEndX - 1.05, -0.3];
  const axonEnd: Vec2 = [input.axonEndX, -0.04];
  const axonPath = cubicPath(axonStart, axonControlA, axonControlB, axonEnd);
  const terminalCharge = smoothstep(0.8, 1, input.signalProgress);
  const glowId = `${input.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-neuron-glow`;
  const parts = [
    `<svg width="100%" height="100%" viewBox="${number(left)} ${number(VIEW_TOP)} ${number(input.width)} ${number(VIEW_HEIGHT)}" overflow="visible" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Stylised biological neuron">`,
    `<defs><filter id="${escapeAttribute(glowId)}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="0.12" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`,
    `<g fill="none" stroke="${escapeAttribute(input.colors.membrane)}" stroke-linecap="round" stroke-linejoin="round">`,
  ];

  for (const dendrite of input.dendrites) {
    const path = cubicPath(dendrite.start, dendrite.controlA, dendrite.controlB, dendrite.end);
    parts.push(`<path d="${path}" stroke-width="0.075" data-neuron-part="dendrite"/>`);
    for (const [from, to] of dendrite.twigs) {
      parts.push(`<path d="M ${point(from)} Q ${number((from[0] + to[0]) / 2 - 0.12)} ${number((from[1] + to[1]) / 2)} ${point(to)}" stroke-width="0.052" data-neuron-part="dendrite-twig"/>`);
    }
  }
  parts.push(`<path d="${axonPath}" stroke-width="0.105" data-neuron-part="axon"/>`);
  parts.push(`</g>`);

  if (input.myelinated) {
    for (let index = 0; index < 6; index += 1) {
      const from = 0.12 + index * 0.135;
      const to = from + 0.085;
      const start = cubicPoint(axonStart, axonControlA, axonControlB, axonEnd, from);
      const end = cubicPoint(axonStart, axonControlA, axonControlB, axonEnd, to);
      parts.push(`<line x1="${number(start[0])}" y1="${number(start[1])}" x2="${number(end[0])}" y2="${number(end[1])}" stroke="${escapeAttribute(input.colors.myelin)}" stroke-width="0.25" stroke-linecap="round" opacity="0.86" data-neuron-part="myelin"/>`);
    }
  }

  const terminals = terminalBranches(axonEnd);
  for (const terminal of terminals) {
    parts.push(`<path d="M ${point(axonEnd)} Q ${number(input.axonEndX + 0.22)} ${number(terminal[1] * 0.55)} ${point(terminal)}" fill="none" stroke="${escapeAttribute(input.colors.membrane)}" stroke-width="0.065" stroke-linecap="round" data-neuron-part="terminal"/>`);
    parts.push(`<circle cx="${number(terminal[0])}" cy="${number(terminal[1])}" r="${number(0.08 + terminalCharge * 0.035)}" fill="${escapeAttribute(input.colors.signal)}" opacity="${number(0.26 + terminalCharge * 0.74)}"${terminalCharge > 0 ? ` filter="url(#${escapeAttribute(glowId)})"` : ""} data-neuron-part="terminal-button"/>`);
  }

  const somaGlow = 0.08 + input.charge * 0.58;
  parts.push(`<circle cx="${number(SOMA[0])}" cy="0" r="${number(SOMA_RADIUS + 0.12 + input.charge * 0.18)}" fill="${escapeAttribute(input.colors.signal)}" opacity="${number(somaGlow)}" filter="url(#${escapeAttribute(glowId)})" data-neuron-part="soma-glow"/>`);
  parts.push(`<path d="${somaPath()}" fill="${escapeAttribute(input.colors.cell)}" stroke="${escapeAttribute(input.colors.membrane)}" stroke-width="0.075" data-neuron-part="soma"/>`);
  parts.push(`<circle cx="${number(SOMA[0] - 0.08)}" cy="-0.04" r="0.225" fill="${escapeAttribute(input.colors.nucleus)}" opacity="${number(0.64 + input.charge * 0.36)}" data-neuron-part="nucleus"/>`);
  parts.push(`<circle cx="${number(SOMA[0] - 0.14)}" cy="-0.1" r="0.055" fill="white" opacity="0.34"/>`);

  if (input.inputProgress > 0 && input.inputProgress < 1) {
    input.dendrites.forEach((dendrite, index) => {
      const offset = Math.min(1, input.inputProgress * 1.13 - index * 0.016);
      if (offset <= 0) return;
      const pulse = cubicPoint(dendrite.end, dendrite.controlB, dendrite.controlA, dendrite.start, offset);
      parts.push(`<circle cx="${number(pulse[0])}" cy="${number(pulse[1])}" r="0.09" fill="${escapeAttribute(input.colors.inputSignal)}" filter="url(#${escapeAttribute(glowId)})" data-neuron-part="input-pulse"/>`);
    });
  }

  if (input.signalProgress > 0) {
    parts.push(`<path d="${axonPath}" fill="none" stroke="${escapeAttribute(input.colors.signal)}" stroke-width="0.115" stroke-linecap="round" pathLength="1" stroke-dasharray="${number(input.signalProgress)} 1" filter="url(#${escapeAttribute(glowId)})" data-neuron-part="signal-trail"/>`);
    const pulse = cubicPoint(axonStart, axonControlA, axonControlB, axonEnd, input.signalProgress);
    parts.push(`<circle cx="${number(pulse[0])}" cy="${number(pulse[1])}" r="0.115" fill="${escapeAttribute(input.colors.signal)}" filter="url(#${escapeAttribute(glowId)})" data-neuron-part="axon-pulse"/>`);
  }

  parts.push(`</svg>`);
  return parts.join("");
}

function dendrites(count: number): readonly DendriteGeometry[] {
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const angle = (-132 + ratio * 264) * Math.PI / 180;
    const start: Vec2 = [
      SOMA[0] + Math.cos(angle) * SOMA_RADIUS * 0.88,
      Math.sin(angle) * SOMA_RADIUS * 0.88,
    ];
    const reach = 2.35 + ((index * 37) % 5) * 0.16;
    const end: Vec2 = [
      SOMA[0] - reach,
      -2.05 + ratio * 4.1 + Math.sin(index * 2.17) * 0.15,
    ];
    const controlA: Vec2 = [start[0] - 0.55, start[1] + Math.sin(angle) * 0.52];
    const controlB: Vec2 = [end[0] + 0.72, end[1] * 0.82];
    const twigY = ratio < 0.5 ? -1 : 1;
    const twigs: readonly (readonly [Vec2, Vec2])[] = [
      [end, [end[0] - 0.3, end[1] + twigY * 0.28]],
      [[end[0] + 0.25, end[1] * 0.93], [end[0] - 0.03, end[1] - twigY * 0.34]],
    ];
    return { start, controlA, controlB, end, twigs };
  });
}

function terminalBranches(axonEnd: Vec2): readonly Vec2[] {
  return [-0.72, -0.37, 0, 0.38, 0.74].map((y, index) => [
    axonEnd[0] + 0.34 + (index === 2 ? 0.08 : 0),
    y,
  ] as Vec2);
}

function somaPath(): string {
  const [x, y] = SOMA;
  return [
    `M ${number(x - 0.56)} ${number(y - 0.1)}`,
    `C ${number(x - 0.5)} ${number(y - 0.52)} ${number(x - 0.14)} ${number(y - 0.67)} ${number(x + 0.23)} ${number(y - 0.52)}`,
    `C ${number(x + 0.62)} ${number(y - 0.36)} ${number(x + 0.68)} ${number(y + 0.16)} ${number(x + 0.39)} ${number(y + 0.46)}`,
    `C ${number(x + 0.04)} ${number(y + 0.7)} ${number(x - 0.43)} ${number(y + 0.51)} ${number(x - 0.57)} ${number(y + 0.15)}`,
    `C ${number(x - 0.62)} ${number(y + 0.05)} ${number(x - 0.61)} ${number(y - 0.02)} ${number(x - 0.56)} ${number(y - 0.1)} Z`,
  ].join(" ");
}

function cubicPath(start: Vec2, a: Vec2, b: Vec2, end: Vec2): string {
  return `M ${point(start)} C ${point(a)} ${point(b)} ${point(end)}`;
}

function cubicPoint(start: Vec2, a: Vec2, b: Vec2, end: Vec2, progress: number): Vec2 {
  const t = clamp01(progress);
  const inverse = 1 - t;
  return [
    inverse ** 3 * start[0] + 3 * inverse ** 2 * t * a[0] + 3 * inverse * t ** 2 * b[0] + t ** 3 * end[0],
    inverse ** 3 * start[1] + 3 * inverse ** 2 * t * a[1] + 3 * inverse * t ** 2 * b[1] + t ** 3 * end[1],
  ];
}

function point(value: Vec2): string {
  return `${number(value[0])} ${number(value[1])}`;
}

function number(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function unit(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1; received ${value}.`);
  }
  return value;
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive; received ${value}.`);
  return value;
}

function integerInRange(value: number, label: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}; received ${value}.`);
  }
  return value;
}

function smoothstep(from: number, to: number, value: number): number {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
