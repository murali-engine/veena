import {
  CanvasTattva,
  type CanvasContext,
  type CanvasSample,
} from "../../core/CanvasTattva.ts";
import type { TattvaState, Vec2 } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themes,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";

export interface LearningParameterSpec {
  readonly id?: string;
  readonly initial?: number;
  readonly target?: number;
  readonly min?: number;
  readonly max?: number;
  readonly color?: ColorInput;
}

export type LearningParameterLayout = (
  index: number,
  count: number,
) => Vec2;

export interface LearningParameterFieldOptions {
  /** Number of training epochs at which every bar reaches its target exactly. */
  readonly epochs?: number;
  readonly seed?: number;
  readonly size?: Vec2;
  readonly columns?: number;
  /** Returns normalized [x, y] coordinates. Useful for matrices, banks, arcs, or model layers. */
  readonly layout?: LearningParameterLayout;
  readonly range?: Vec2;
  readonly initialRange?: Vec2;
  readonly targetRange?: Vec2;
  /** Maximum early-training stochastic variation, as a fraction of the parameter range. */
  readonly noise?: number;
  /** Higher values pull the mean toward its target earlier. */
  readonly settlingRate?: number;
  readonly barWidthRatio?: number;
  readonly barHeightRatio?: number;
  /** One calm color for both signs. Positive/negative colors can override it. */
  readonly barColor?: ColorInput;
  readonly positiveColor?: ColorInput;
  readonly negativeColor?: ColorInput;
  readonly trackColor?: ColorInput;
  readonly background?: ColorInput | null;
  readonly title?: string;
  readonly showEpoch?: boolean;
}

export interface LearningParameterFieldState extends TattvaState {
  epoch: number;
}

export interface LearningParameterSampleOptions {
  readonly epochs: number;
  readonly seed: number;
  readonly noise: number;
  readonly settlingRate: number;
}

interface NormalizedParameter {
  readonly id: string;
  readonly initial: number;
  readonly target: number;
  readonly min: number;
  readonly max: number;
  readonly color?: ColorInput;
}

interface FieldColors {
  positive: string;
  negative: string;
  track: string;
  background: string | null;
  text: string;
  mutedText: string;
  parameter: readonly (string | undefined)[];
}

interface FieldColorInputs {
  readonly positive: ColorInput;
  readonly negative: ColorInput;
  readonly track: ColorInput;
  readonly background: ColorInput | null;
}

interface FieldRenderConfig {
  readonly parameters: readonly NormalizedParameter[];
  readonly positions: readonly Vec2[];
  readonly columns: number;
  readonly rows: number;
  readonly epochs: number;
  readonly seed: number;
  readonly noise: number;
  readonly settlingRate: number;
  readonly barWidthRatio: number;
  readonly barHeightRatio: number;
  readonly title?: string;
  readonly showEpoch: boolean;
  colors: FieldColors;
}

/**
 * Hundreds of tiny deterministic parameter meters whose stochastic motion settles
 * into learned targets over an authored number of epochs.
 */
export function LearningParameterField(
  parameters: number | readonly LearningParameterSpec[],
  options: LearningParameterFieldOptions = {},
): LearningParameterFieldTattva {
  return new LearningParameterFieldTattva(parameters, options);
}

export class LearningParameterFieldTattva extends CanvasTattva<LearningParameterFieldState> {
  readonly parameterCount: number;
  readonly epochs: number;
  readonly positions: readonly Vec2[];
  private readonly renderConfig: FieldRenderConfig;
  private readonly colorInputs: FieldColorInputs;

  constructor(
    source: number | readonly LearningParameterSpec[],
    options: LearningParameterFieldOptions = {},
  ) {
    const count = typeof source === "number" ? positiveInteger(source, "Learning parameter count") : source.length;
    if (count === 0) throw new Error("LearningParameterField needs at least one parameter.");
    const epochs = positiveInteger(options.epochs ?? 100, "Learning epoch count");
    const seed = finite(options.seed ?? 1, "Learning parameter seed");
    const size = options.size ?? [8, 4.5];
    validateRange(size, "Learning parameter field size", true);
    const range = options.range ?? [-1, 1];
    validateRange(range, "Learning parameter range");
    const initialRange = options.initialRange ?? range;
    const targetRange = options.targetRange ?? [
      mix(range[0], range[1], 0.175),
      mix(range[0], range[1], 0.825),
    ];
    validateContainedRange(initialRange, range, "Learning initial range");
    validateContainedRange(targetRange, range, "Learning target range");
    const columns = Math.min(
      count,
      positiveInteger(options.columns ?? Math.ceil(Math.sqrt(count * size[0] / size[1])), "Learning parameter columns"),
    );
    const rows = Math.ceil(count / columns);
    const specs = typeof source === "number" ? Array.from({ length: count }, () => ({})) : source;
    const ids = new Set<string>();
    const normalized = specs.map((spec, index) => normalizeParameter(
      spec,
      index,
      seed,
      range,
      initialRange,
      targetRange,
      ids,
    ));
    const positions = normalized.map((_, index) => {
      const point = options.layout
        ? options.layout(index, count)
        : gridPosition(index, columns, rows);
      return normalizedPoint(point, index);
    });
    const colorInputs = {
      positive: options.positiveColor ?? options.barColor ?? "rgba(113, 148, 154, 0.92)",
      negative: options.negativeColor ?? options.barColor ?? "rgba(105, 137, 143, 0.88)",
      track: options.trackColor ?? "rgba(153, 164, 170, 0.14)",
      background: options.background === undefined ? null : options.background,
    };
    const renderConfig: FieldRenderConfig = {
      parameters: normalized,
      positions,
      columns,
      rows,
      epochs,
      seed,
      noise: nonnegative(options.noise ?? 0.22, "Learning parameter noise"),
      settlingRate: positive(options.settlingRate ?? 5.2, "Learning settling rate"),
      barWidthRatio: positive(options.barWidthRatio ?? 0.34, "Learning bar width ratio"),
      barHeightRatio: positive(options.barHeightRatio ?? 0.76, "Learning bar height ratio"),
      title: options.title,
      showEpoch: options.showEpoch ?? true,
      colors: resolveFieldColors(colorInputs, normalized, themes.dark),
    };
    super({
      draw(context, state, sample) {
        drawParameterField(context, state, sample, renderConfig);
      },
    }, { size, state: { epoch: 0 } });
    this.parameterCount = count;
    this.epochs = epochs;
    this.positions = positions;
    this.renderConfig = renderConfig;
    this.colorInputs = colorInputs;
  }

  epoch(value: number): this {
    return this.setInitial({ epoch: finiteNonnegative(value, "Learning epoch") });
  }

  epochState(value: number): Partial<LearningParameterFieldState> {
    return { epoch: finiteNonnegative(value, "Learning epoch") };
  }

  protected override onThemeResolved(theme: Theme): void {
    this.renderConfig.colors = resolveFieldColors(
      this.colorInputs,
      this.renderConfig.parameters,
      theme,
    );
  }
}

/** Deterministically sample one parameter at any fractional epoch. */
export function sampleLearningParameter(
  parameter: Pick<LearningParameterSpec, "initial" | "target" | "min" | "max">,
  index: number,
  epoch: number,
  options: LearningParameterSampleOptions,
): number {
  const min = finite(parameter.min ?? -1, "Learning parameter minimum");
  const max = finite(parameter.max ?? 1, "Learning parameter maximum");
  if (max <= min) throw new Error("Learning parameter maximum must be greater than its minimum.");
  const initial = finite(parameter.initial ?? 0, "Learning parameter initial value");
  const target = finite(parameter.target ?? 0, "Learning parameter target value");
  const epochs = positiveInteger(options.epochs, "Learning epoch count");
  const seed = finite(options.seed, "Learning parameter seed");
  const noise = nonnegative(options.noise, "Learning parameter noise");
  const settlingRate = positive(options.settlingRate, "Learning settling rate");
  const sampledEpoch = clamp(finiteNonnegative(epoch, "Learning epoch"), 0, epochs);
  if (sampledEpoch >= epochs) return clamp(target, min, max);
  const progress = sampledEpoch / epochs;
  const denominator = 1 - Math.exp(-settlingRate);
  const convergence = denominator <= 1e-9
    ? progress
    : (1 - Math.exp(-settlingRate * progress)) / denominator;
  const mean = mix(initial, target, convergence);
  const wholeEpoch = Math.floor(sampledEpoch);
  const fraction = sampledEpoch - wholeEpoch;
  const previousNoise = wholeEpoch === 0 ? 0 : signedHash(seed, index, wholeEpoch);
  const nextNoise = signedHash(seed, index, wholeEpoch + 1);
  const stochastic = mix(previousNoise, nextNoise, smoothstep(fraction));
  const amplitude = noise * (max - min) * (1 - progress) ** 1.75;
  return clamp(mean + stochastic * amplitude, min, max);
}

function drawParameterField(
  { canvas, context, pixelsPerUnit }: CanvasContext,
  state: Readonly<LearningParameterFieldState>,
  _sample: Readonly<CanvasSample>,
  config: FieldRenderConfig,
): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (config.colors.background) {
    context.fillStyle = config.colors.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const headerHeight = config.title || config.showEpoch ? Math.min(canvas.height * 0.13, pixelsPerUnit * 0.52) : 0;
  const insetX = Math.max(2, canvas.width * 0.018);
  const insetBottom = Math.max(2, canvas.height * 0.025);
  const fieldTop = headerHeight + Math.max(2, canvas.height * 0.018);
  const fieldWidth = canvas.width - insetX * 2;
  const fieldHeight = canvas.height - fieldTop - insetBottom;
  const cellWidth = fieldWidth / config.columns;
  const cellHeight = fieldHeight / config.rows;
  const barWidth = Math.max(1, cellWidth * config.barWidthRatio);
  const barHeight = Math.max(2, cellHeight * config.barHeightRatio);
  const epoch = clamp(state.epoch, 0, config.epochs);

  if (config.title) {
    context.fillStyle = config.colors.text;
    context.font = `700 ${Math.max(10, pixelsPerUnit * 0.19)}px Inter, ui-sans-serif, system-ui, sans-serif`;
    context.textBaseline = "middle";
    context.textAlign = "left";
    context.fillText(config.title, insetX, headerHeight * 0.5);
  }
  if (config.showEpoch) {
    context.fillStyle = config.colors.mutedText;
    context.font = `650 ${Math.max(9, pixelsPerUnit * 0.145)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.textBaseline = "middle";
    context.textAlign = "right";
    context.fillText(
      `EPOCH ${String(Math.floor(epoch)).padStart(String(config.epochs).length, "0")} / ${config.epochs}`,
      canvas.width - insetX,
      headerHeight * 0.5,
    );
  }

  config.parameters.forEach((parameter, index) => {
    const position = config.positions[index]!;
    const x = insetX + position[0] * fieldWidth;
    const centerY = fieldTop + position[1] * fieldHeight;
    const top = centerY - barHeight / 2;
    const value = sampleLearningParameter(parameter, index, epoch, config);
    const normalized = clamp((value - parameter.min) / (parameter.max - parameter.min), 0, 1);
    const zero = clamp((0 - parameter.min) / (parameter.max - parameter.min), 0, 1);
    const valueY = top + (1 - normalized) * barHeight;
    const zeroY = top + (1 - zero) * barHeight;
    context.globalAlpha = 0.72;
    context.fillStyle = config.colors.track;
    roundedRect(context, x - barWidth / 2, top, barWidth, barHeight, barWidth * 0.22);
    context.globalAlpha = 1;
    context.fillStyle = config.colors.parameter[index]
      ?? (value >= 0 ? config.colors.positive : config.colors.negative);
    roundedRect(
      context,
      x - barWidth / 2,
      Math.min(valueY, zeroY),
      barWidth,
      Math.max(1, Math.abs(valueY - zeroY)),
      barWidth * 0.2,
    );
  });
  context.globalAlpha = 1;
}

function normalizeParameter(
  spec: LearningParameterSpec,
  index: number,
  seed: number,
  defaultRange: Vec2,
  initialRange: Vec2,
  targetRange: Vec2,
  ids: Set<string>,
): NormalizedParameter {
  const id = (spec.id ?? `parameter-${index}`).trim();
  if (id.length === 0) throw new Error("Learning parameter id cannot be empty.");
  if (ids.has(id)) throw new Error(`Duplicate learning parameter id: ${id}.`);
  ids.add(id);
  const min = finite(spec.min ?? defaultRange[0], `Learning parameter minimum ${id}`);
  const max = finite(spec.max ?? defaultRange[1], `Learning parameter maximum ${id}`);
  if (max <= min) throw new Error(`Learning parameter maximum ${id} must be greater than its minimum.`);
  const initial = finite(
    spec.initial ?? mix(initialRange[0], initialRange[1], hash01(seed + index * 17.17 + 1)),
    `Learning parameter initial value ${id}`,
  );
  const target = finite(
    spec.target ?? mix(targetRange[0], targetRange[1], hash01(seed + index * 29.29 + 2)),
    `Learning parameter target value ${id}`,
  );
  return { id, initial: clamp(initial, min, max), target: clamp(target, min, max), min, max, color: spec.color };
}

function gridPosition(index: number, columns: number, rows: number): Vec2 {
  return [
    (index % columns + 0.5) / columns,
    (Math.floor(index / columns) + 0.5) / rows,
  ];
}

function normalizedPoint(point: Vec2, index: number): Vec2 {
  if (point.length !== 2 || !point.every(Number.isFinite)) {
    throw new Error(`Learning parameter layout ${index} must return two finite coordinates.`);
  }
  if (point[0] < 0 || point[0] > 1 || point[1] < 0 || point[1] > 1) {
    throw new Error(`Learning parameter layout ${index} must stay within normalized 0..1 coordinates.`);
  }
  return [point[0], point[1]];
}

function resolveFieldColors(
  inputs: FieldColorInputs,
  parameters: readonly NormalizedParameter[],
  theme: Theme,
): FieldColors {
  return {
    positive: resolveColorInput(inputs.positive, theme),
    negative: resolveColorInput(inputs.negative, theme),
    track: resolveColorInput(inputs.track, theme),
    background: inputs.background === null ? null : resolveColorInput(inputs.background, theme),
    text: theme.colors.textPrimary,
    mutedText: theme.colors.textSecondary,
    parameter: parameters.map((parameter) => parameter.color
      ? resolveColorInput(parameter.color, theme)
      : undefined),
  };
}

function signedHash(seed: number, index: number, epoch: number): number {
  return hash01(seed * 13.37 + index * 91.73 + epoch * 47.11) * 2 - 1;
}

function hash01(value: number): number {
  const sine = Math.sin(value * 12.9898 + 78.233) * 43758.5453123;
  return sine - Math.floor(sine);
}

function validateContainedRange(value: Vec2, container: Vec2, label: string): void {
  validateRange(value, label);
  if (value[0] < container[0] || value[1] > container[1]) {
    throw new Error(`${label} must stay inside [${container[0]}, ${container[1]}].`);
  }
}

function validateRange(value: Vec2, label: string, positiveValues = false): void {
  finite(value[0], `${label} start`);
  finite(value[1], `${label} end`);
  if (positiveValues ? value[0] <= 0 || value[1] <= 0 : value[1] <= value[0]) {
    throw new Error(`${label} is invalid; received [${value[0]}, ${value[1]}].`);
  }
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite; received ${value}.`);
  return value;
}

function finiteNonnegative(value: number, label: string): number {
  finite(value, label);
  if (value < 0) throw new Error(`${label} must be non-negative; received ${value}.`);
  return value;
}

function nonnegative(value: number, label: string): number {
  return finiteNonnegative(value, label);
}

function positive(value: number, label: string): number {
  finite(value, label);
  if (value <= 0) throw new Error(`${label} must be positive; received ${value}.`);
  return value;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer; received ${value}.`);
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function smoothstep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
  context.fill();
}
