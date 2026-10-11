import { CanvasTattva } from "../../core/CanvasTattva.ts";
import type { TattvaState, Vec2 } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themes,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";
import {
  sampleLearningParameter,
  type LearningParameterLayout,
  type LearningParameterSampleOptions,
  type LearningParameterSpec,
} from "./learning-parameter-field.ts";

export interface LearningMeterGaugeOptions {
  readonly epochs?: number;
  readonly seed?: number;
  readonly size?: Vec2;
  readonly columns?: number;
  readonly layout?: LearningParameterLayout;
  readonly range?: Vec2;
  readonly initialRange?: Vec2;
  readonly targetRange?: Vec2;
  readonly noise?: number;
  readonly settlingRate?: number;
  readonly gaugeScale?: number;
  readonly ticks?: number;
  readonly arcColor?: ColorInput;
  readonly needleColor?: ColorInput;
  readonly background?: ColorInput | null;
  readonly title?: string;
  readonly showEpoch?: boolean;
}

export interface LearningMeterGaugeState extends TattvaState {
  epoch: number;
}

interface MeterParameter {
  readonly id: string;
  readonly initial: number;
  readonly target: number;
  readonly min: number;
  readonly max: number;
  readonly color?: ColorInput;
}

interface MeterColorInputs {
  readonly arc: ColorInput;
  readonly needle: ColorInput;
  readonly background: ColorInput | null;
}

interface MeterColors {
  readonly arc: string;
  readonly needle: string;
  readonly background: string | null;
  readonly text: string;
  readonly mutedText: string;
  readonly parameter: readonly (string | undefined)[];
}

interface MeterRenderConfig extends LearningParameterSampleOptions {
  readonly parameters: readonly MeterParameter[];
  readonly positions: readonly Vec2[];
  readonly columns: number;
  readonly rows: number;
  readonly gaugeScale: number;
  readonly ticks: number;
  readonly title?: string;
  readonly showEpoch: boolean;
  colors: MeterColors;
}

/** A dense field of subdued semicircular meters driven by learning epochs. */
export function LearningMeterGaugeField(
  parameters: number | readonly LearningParameterSpec[],
  options: LearningMeterGaugeOptions = {},
): LearningMeterGaugeFieldTattva {
  return new LearningMeterGaugeFieldTattva(parameters, options);
}

export class LearningMeterGaugeFieldTattva extends CanvasTattva<LearningMeterGaugeState> {
  readonly parameterCount: number;
  readonly epochs: number;
  readonly positions: readonly Vec2[];
  private readonly renderConfig: MeterRenderConfig;
  private readonly colorInputs: MeterColorInputs;

  constructor(
    source: number | readonly LearningParameterSpec[],
    options: LearningMeterGaugeOptions = {},
  ) {
    const count = typeof source === "number" ? positiveInteger(source, "Learning meter count") : source.length;
    if (count === 0) throw new Error("LearningMeterGaugeField needs at least one parameter.");
    const epochs = positiveInteger(options.epochs ?? 100, "Learning meter epoch count");
    const seed = finite(options.seed ?? 1, "Learning meter seed");
    const size = options.size ?? [8, 4.5];
    positive(size[0], "Learning meter width");
    positive(size[1], "Learning meter height");
    const range = options.range ?? [-1, 1];
    validateRange(range, "Learning meter range");
    const initialRange = options.initialRange ?? range;
    const targetRange = options.targetRange ?? [
      mix(range[0], range[1], 0.175),
      mix(range[0], range[1], 0.825),
    ];
    validateContainedRange(initialRange, range, "Learning meter initial range");
    validateContainedRange(targetRange, range, "Learning meter target range");
    const columns = Math.min(
      count,
      positiveInteger(options.columns ?? Math.ceil(Math.sqrt(count * size[0] / size[1])), "Learning meter columns"),
    );
    const rows = Math.ceil(count / columns);
    const specs = typeof source === "number" ? Array.from({ length: count }, () => ({})) : source;
    const ids = new Set<string>();
    const parameters = specs.map((spec, index) => normalizeMeterParameter(
      spec,
      index,
      seed,
      range,
      initialRange,
      targetRange,
      ids,
    ));
    const positions = parameters.map((_, index) => normalizedPoint(
      options.layout ? options.layout(index, count) : gridPosition(index, columns, rows),
      index,
    ));
    const colorInputs: MeterColorInputs = {
      arc: options.arcColor ?? "rgba(177, 184, 184, 0.48)",
      needle: options.needleColor ?? "rgba(82, 116, 121, 0.82)",
      background: options.background === undefined ? null : options.background,
    };
    const renderConfig: MeterRenderConfig = {
      parameters,
      positions,
      columns,
      rows,
      epochs,
      seed,
      noise: nonnegative(options.noise ?? 0.2, "Learning meter noise"),
      settlingRate: positive(options.settlingRate ?? 5.2, "Learning meter settling rate"),
      gaugeScale: positive(options.gaugeScale ?? 0.82, "Learning meter scale"),
      ticks: positiveInteger(options.ticks ?? 9, "Learning meter tick count"),
      title: options.title,
      showEpoch: options.showEpoch ?? true,
      colors: resolveMeterColors(colorInputs, parameters, themes.dark),
    };
    super({
      draw({ canvas, context, pixelsPerUnit }, state) {
        drawMeters(canvas, context, pixelsPerUnit, renderConfig, state);
      },
    }, { size, state: { epoch: 0 } });
    this.parameterCount = count;
    this.epochs = epochs;
    this.positions = positions;
    this.renderConfig = renderConfig;
    this.colorInputs = colorInputs;
  }

  epoch(value: number): this {
    return this.setInitial({ epoch: finiteNonnegative(value, "Learning meter epoch") });
  }

  epochState(value: number): Partial<LearningMeterGaugeState> {
    return { epoch: finiteNonnegative(value, "Learning meter epoch") };
  }

  protected override onThemeResolved(theme: Theme): void {
    this.renderConfig.colors = resolveMeterColors(
      this.colorInputs,
      this.renderConfig.parameters,
      theme,
    );
  }
}

function drawMeters(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  pixelsPerUnit: number,
  config: MeterRenderConfig,
  state: Readonly<LearningMeterGaugeState>,
): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (config.colors.background) {
    context.fillStyle = config.colors.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const headerHeight = config.title || config.showEpoch ? Math.min(canvas.height * 0.13, pixelsPerUnit * 0.52) : 0;
  const insetX = Math.max(2, canvas.width * 0.018);
  const fieldTop = headerHeight + Math.max(2, canvas.height * 0.018);
  const fieldWidth = canvas.width - insetX * 2;
  const fieldHeight = canvas.height - fieldTop - Math.max(2, canvas.height * 0.025);
  const cellWidth = fieldWidth / config.columns;
  const cellHeight = fieldHeight / config.rows;
  const radius = Math.max(2, Math.min(cellWidth * 0.45, cellHeight * 0.47) * config.gaugeScale);
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

  context.lineCap = "round";
  config.parameters.forEach((parameter, index) => {
    const position = config.positions[index]!;
    const x = insetX + position[0] * fieldWidth;
    const y = fieldTop + position[1] * fieldHeight + radius * 0.17;
    const value = sampleLearningParameter(parameter, index, epoch, config);
    drawMeter(context, x, y, radius, value, parameter, config, index);
  });
}

function drawMeter(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  value: number,
  parameter: MeterParameter,
  config: MeterRenderConfig,
  index: number,
): void {
  const start = Math.PI * 0.82;
  const end = Math.PI * 2.18;
  const normalized = clamp((value - parameter.min) / (parameter.max - parameter.min), 0, 1);
  context.strokeStyle = config.colors.arc;
  context.lineWidth = Math.max(0.8, radius * 0.065);
  context.beginPath();
  context.arc(x, y, radius, start, end);
  context.stroke();
  for (let tick = 0; tick < config.ticks; tick += 1) {
    const amount = config.ticks === 1 ? 0.5 : tick / (config.ticks - 1);
    const angle = mix(start, end, amount);
    const inner = radius * (tick === 0 || tick === config.ticks - 1 ? 0.73 : 0.79);
    context.lineWidth = Math.max(0.7, radius * 0.045);
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    context.lineTo(x + Math.cos(angle) * radius * 0.96, y + Math.sin(angle) * radius * 0.96);
    context.stroke();
  }
  const angle = mix(start, end, normalized);
  const needleColor = config.colors.parameter[index] ?? config.colors.needle;
  const tipX = x + Math.cos(angle) * radius * 0.72;
  const tipY = y + Math.sin(angle) * radius * 0.72;
  const normalX = -Math.sin(angle) * radius * 0.085;
  const normalY = Math.cos(angle) * radius * 0.085;
  context.fillStyle = needleColor;
  context.beginPath();
  context.moveTo(x + normalX, y + normalY);
  context.lineTo(tipX, tipY);
  context.lineTo(x - normalX, y - normalY);
  context.closePath();
  context.fill();
  context.beginPath();
  context.arc(x, y, Math.max(1, radius * 0.1), 0, Math.PI * 2);
  context.fill();
}

function normalizeMeterParameter(
  spec: LearningParameterSpec,
  index: number,
  seed: number,
  range: Vec2,
  initialRange: Vec2,
  targetRange: Vec2,
  ids: Set<string>,
): MeterParameter {
  const id = (spec.id ?? `meter-${index}`).trim();
  if (id.length === 0) throw new Error("Learning meter id cannot be empty.");
  if (ids.has(id)) throw new Error(`Duplicate learning meter id: ${id}.`);
  ids.add(id);
  const min = finite(spec.min ?? range[0], `Learning meter minimum ${id}`);
  const max = finite(spec.max ?? range[1], `Learning meter maximum ${id}`);
  if (max <= min) throw new Error(`Learning meter maximum ${id} must be greater than its minimum.`);
  return {
    id,
    min,
    max,
    initial: clamp(spec.initial ?? mix(initialRange[0], initialRange[1], hash01(seed + index * 17.17 + 1)), min, max),
    target: clamp(spec.target ?? mix(targetRange[0], targetRange[1], hash01(seed + index * 29.29 + 2)), min, max),
    color: spec.color,
  };
}

function resolveMeterColors(
  inputs: MeterColorInputs,
  parameters: readonly MeterParameter[],
  theme: Theme,
): MeterColors {
  return {
    arc: resolveColorInput(inputs.arc, theme),
    needle: resolveColorInput(inputs.needle, theme),
    background: inputs.background === null ? null : resolveColorInput(inputs.background, theme),
    text: theme.colors.textPrimary,
    mutedText: theme.colors.textSecondary,
    parameter: parameters.map((parameter) => parameter.color
      ? resolveColorInput(parameter.color, theme)
      : undefined),
  };
}

function gridPosition(index: number, columns: number, rows: number): Vec2 {
  return [(index % columns + 0.5) / columns, (Math.floor(index / columns) + 0.5) / rows];
}

function normalizedPoint(point: Vec2, index: number): Vec2 {
  if (!point.every(Number.isFinite) || point[0] < 0 || point[0] > 1 || point[1] < 0 || point[1] > 1) {
    throw new Error(`Learning meter layout ${index} must return normalized 0..1 coordinates.`);
  }
  return [point[0], point[1]];
}

function validateRange(value: Vec2, label: string): void {
  finite(value[0], `${label} start`);
  finite(value[1], `${label} end`);
  if (value[1] <= value[0]) throw new Error(`${label} is invalid; received [${value[0]}, ${value[1]}].`);
}

function validateContainedRange(value: Vec2, container: Vec2, label: string): void {
  validateRange(value, label);
  if (value[0] < container[0] || value[1] > container[1]) {
    throw new Error(`${label} must stay inside [${container[0]}, ${container[1]}].`);
  }
}

function hash01(value: number): number {
  const sine = Math.sin(value * 12.9898 + 78.233) * 43758.5453123;
  return sine - Math.floor(sine);
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

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
