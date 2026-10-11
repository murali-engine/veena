import { Tattva, type TattvaState } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themeColor,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";

export interface EqualizerVariable {
  readonly id: string;
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly value?: number;
  readonly color?: ColorInput;
  readonly unit?: string;
  readonly digits?: number;
}

export interface EqualizerSnapshot {
  readonly name: string;
  /** Values omitted here retain their value from the preceding snapshot. */
  readonly values: Readonly<Record<string, number>>;
}

export interface EqualizerBarsOptions {
  readonly title?: string;
  readonly barHeight?: number;
  readonly barWidth?: number;
  readonly gap?: number;
  readonly padding?: number;
  readonly segments?: number;
  readonly showValues?: boolean;
  readonly background?: ColorInput | null;
  readonly trackColor?: ColorInput;
  readonly textColor?: ColorInput;
  readonly mutedTextColor?: ColorInput;
}

export interface EqualizerBarsState extends TattvaState {
  /** Continuous position between the equalizer's named value snapshots. */
  morphProgress: number;
}

interface NormalizedVariable {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly value: number;
  readonly color: ColorInput;
  readonly unit: string;
  readonly digits: number;
}

interface EqualizerColors {
  readonly bars: readonly string[];
  readonly background: string | null;
  readonly track: string;
  readonly text: string;
  readonly mutedText: string;
}

const DEFAULT_COLORS = [
  themeColor("accent"),
  themeColor("accentAlt"),
  themeColor("positive"),
  themeColor("warning"),
] as const;

/** Segmented, timeline-driven scalar indicators for training and model variables. */
export function EqualizerBars(
  variables: readonly EqualizerVariable[],
  options: EqualizerBarsOptions = {},
): EqualizerBarsTattva {
  return new EqualizerBarsTattva(variables, options);
}

export class EqualizerBarsTattva extends Tattva<EqualizerBarsState> {
  readonly variables: readonly NormalizedVariable[];
  private readonly snapshots: EqualizerSnapshot[];
  private readonly barHeight: number;
  private readonly barWidth: number;
  private readonly gap: number;
  private readonly padding: number;
  private readonly segments: number;
  private readonly showValues: boolean;
  private readonly title?: string;
  private readonly colorInputs: {
    readonly background: ColorInput | null;
    readonly track: ColorInput;
    readonly text: ColorInput;
    readonly mutedText: ColorInput;
  };
  private colors!: EqualizerColors;

  constructor(
    variables: readonly EqualizerVariable[],
    options: EqualizerBarsOptions = {},
  ) {
    super({ state: { morphProgress: 0 } });
    if (variables.length === 0) throw new Error("EqualizerBars needs at least one variable.");
    const ids = new Set<string>();
    this.variables = variables.map((variable, index) => normalizeVariable(variable, index, ids));
    this.barHeight = positive(options.barHeight ?? 2.5, "Equalizer bar height");
    this.barWidth = positive(options.barWidth ?? 0.48, "Equalizer bar width");
    this.gap = nonnegative(options.gap ?? 0.26, "Equalizer bar gap");
    this.padding = nonnegative(options.padding ?? 0.3, "Equalizer padding");
    this.segments = positiveInteger(options.segments ?? 12, "Equalizer segment count");
    this.showValues = options.showValues ?? true;
    this.title = options.title;
    this.colorInputs = {
      background: options.background === undefined ? null : options.background,
      track: options.trackColor ?? themeColor("surfaceElevated"),
      text: options.textColor ?? themeColor("textPrimary"),
      mutedText: options.mutedTextColor ?? themeColor("textSecondary"),
    };
    this.snapshots = [{
      name: "initial",
      values: Object.fromEntries(this.variables.map((variable) => [variable.id, variable.value])),
    }];
    this.dynamicGeometry = true;
    this.morphStageCount = 1;
    this.worldSize = {
      width: this.padding * 2
        + this.variables.length * this.barWidth
        + Math.max(0, this.variables.length - 1) * this.gap,
      height: this.padding * 2 + this.barHeight + (this.showValues ? 0.38 : 0) + 0.42
        + (this.title ? 0.42 : 0),
    };
    this.resolveColors(this.resolvedTheme);
  }

  /** Append a named target state. Partial snapshots retain preceding values. */
  snapshot(snapshot: EqualizerSnapshot): this {
    const name = snapshot.name.trim();
    if (name.length === 0) throw new Error("Equalizer snapshot name cannot be empty.");
    if (this.snapshots.some((candidate) => candidate.name === name)) {
      throw new Error(`Duplicate equalizer snapshot name: ${name}.`);
    }
    const known = new Set(this.variables.map((variable) => variable.id));
    for (const [id, value] of Object.entries(snapshot.values)) {
      if (!known.has(id)) throw new Error(`Unknown equalizer variable: ${id}.`);
      finite(value, `Equalizer value ${id}`);
    }
    this.snapshots.push({ name, values: { ...snapshot.values } });
    this.morphStageCount = this.snapshots.length;
    return this;
  }

  snapshotIndex(name: string): number {
    const index = this.snapshots.findIndex((snapshot) => snapshot.name === name);
    if (index < 0) throw new Error(`Unknown equalizer snapshot: ${name}.`);
    return index;
  }

  stage(value: number | string): this {
    const index = typeof value === "string" ? this.snapshotIndex(value) : value;
    if (!Number.isInteger(index) || index < 0 || index >= this.snapshots.length) {
      throw new Error(`Equalizer snapshot must be from 0 to ${this.snapshots.length - 1}; received ${index}.`);
    }
    return this.setInitial({ morphProgress: index });
  }

  override contentHTML(
    _time = 0,
    state: Readonly<EqualizerBarsState> = this.initialState,
  ): string {
    return equalizerMarkup({
      variables: this.variables,
      values: this.valuesAt(state.morphProgress),
      colors: this.colors,
      width: this.worldSize!.width,
      height: this.worldSize!.height,
      barHeight: this.barHeight,
      barWidth: this.barWidth,
      gap: this.gap,
      padding: this.padding,
      segments: this.segments,
      showValues: this.showValues,
      title: this.title,
    });
  }

  protected override onThemeResolved(theme: Theme): void {
    this.resolveColors(theme);
  }

  private resolveColors(theme: Theme): void {
    this.colors = {
      bars: this.variables.map((variable) => resolveColorInput(variable.color, theme)),
      background: this.colorInputs.background === null
        ? null
        : resolveColorInput(this.colorInputs.background, theme),
      track: resolveColorInput(this.colorInputs.track, theme),
      text: resolveColorInput(this.colorInputs.text, theme),
      mutedText: resolveColorInput(this.colorInputs.mutedText, theme),
    };
  }

  private valuesAt(progressValue: number): Readonly<Record<string, number>> {
    const maximum = this.snapshots.length - 1;
    const progress = clamp(progressValue, 0, maximum);
    const left = Math.floor(progress);
    const right = Math.min(maximum, left + 1);
    const amount = progress - left;
    const from = resolveSnapshot(this.variables, this.snapshots, left);
    const to = resolveSnapshot(this.variables, this.snapshots, right);
    return Object.fromEntries(this.variables.map((variable) => [
      variable.id,
      mix(from[variable.id]!, to[variable.id]!, amount),
    ]));
  }
}

interface MarkupInput {
  readonly variables: readonly NormalizedVariable[];
  readonly values: Readonly<Record<string, number>>;
  readonly colors: EqualizerColors;
  readonly width: number;
  readonly height: number;
  readonly barHeight: number;
  readonly barWidth: number;
  readonly gap: number;
  readonly padding: number;
  readonly segments: number;
  readonly showValues: boolean;
  readonly title?: string;
}

function equalizerMarkup(input: MarkupInput): string {
  const { width, height } = input;
  const contentWidth = input.variables.length * input.barWidth
    + Math.max(0, input.variables.length - 1) * input.gap;
  const firstX = (width - contentWidth) / 2 + input.barWidth / 2;
  const labelY = height - input.padding - 0.12;
  const barsBottom = labelY - 0.3;
  const barsTop = barsBottom - input.barHeight;
  const valueY = barsTop - 0.18;
  const titleY = input.padding + 0.13;
  const segmentGap = Math.min(0.06, input.barHeight / input.segments * 0.24);
  const segmentHeight = (input.barHeight - segmentGap * (input.segments - 1)) / input.segments;
  const parts = [
    `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
  ];
  if (input.colors.background) {
    parts.push(`<rect width="${width}" height="${height}" rx="0.18" fill="${escapeAttribute(input.colors.background)}"/>`);
  }
  if (input.title) {
    parts.push(svgText(width / 2, titleY, input.title, 0.2, input.colors.text, "middle", "data-equalizer-title"));
  }
  input.variables.forEach((variable, index) => {
    const x = firstX + index * (input.barWidth + input.gap);
    const value = input.values[variable.id] ?? variable.value;
    const normalized = clamp((value - variable.min) / (variable.max - variable.min), 0, 1);
    const lit = normalized * input.segments;
    for (let segment = 0; segment < input.segments; segment += 1) {
      const y = barsBottom - segmentHeight / 2 - segment * (segmentHeight + segmentGap);
      parts.push(svgRect(x, y, input.barWidth, segmentHeight, input.colors.track, {
        rx: Math.min(input.barWidth, segmentHeight) * 0.18,
        attributes: `data-equalizer-track="${escapeAttribute(variable.id)}"`,
      }));
      const fill = clamp(lit - segment, 0, 1);
      if (fill > 0) {
        const activeHeight = segmentHeight * fill;
        parts.push(svgRect(
          x,
          y + (segmentHeight - activeHeight) / 2,
          input.barWidth,
          activeHeight,
          input.colors.bars[index]!,
          {
            rx: Math.min(input.barWidth, activeHeight) * 0.18,
            attributes: `data-equalizer-fill="${escapeAttribute(variable.id)}" data-fill="${formatNumber(normalized, 4)}"`,
          },
        ));
      }
    }
    if (input.showValues) {
      parts.push(svgText(
        x,
        valueY,
        `${formatNumber(value, variable.digits)}${variable.unit}`,
        0.17,
        input.colors.bars[index]!,
        "middle",
        `data-equalizer-value="${escapeAttribute(variable.id)}"`,
      ));
    }
    parts.push(svgText(
      x,
      labelY,
      variable.label,
      0.15,
      input.colors.mutedText,
      "middle",
      `data-equalizer-label="${escapeAttribute(variable.id)}"`,
    ));
  });
  parts.push("</svg>");
  return parts.join("");
}

function normalizeVariable(
  variable: EqualizerVariable,
  index: number,
  ids: Set<string>,
): NormalizedVariable {
  const id = variable.id.trim();
  if (id.length === 0) throw new Error("Equalizer variable id cannot be empty.");
  if (ids.has(id)) throw new Error(`Duplicate equalizer variable id: ${id}.`);
  ids.add(id);
  const min = finite(variable.min ?? 0, `Equalizer minimum ${id}`);
  const max = finite(variable.max ?? 1, `Equalizer maximum ${id}`);
  if (max <= min) throw new Error(`Equalizer maximum ${id} must be greater than its minimum.`);
  const value = finite(variable.value ?? min, `Equalizer value ${id}`);
  const digits = variable.digits ?? 2;
  if (!Number.isInteger(digits) || digits < 0 || digits > 12) {
    throw new Error(`Equalizer digits ${id} must be an integer from 0 to 12; received ${digits}.`);
  }
  return {
    id,
    label: variable.label,
    min,
    max,
    value,
    color: variable.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]!,
    unit: variable.unit ?? "",
    digits,
  };
}

function resolveSnapshot(
  variables: readonly NormalizedVariable[],
  snapshots: readonly EqualizerSnapshot[],
  index: number,
): Record<string, number> {
  const values = Object.fromEntries(variables.map((variable) => [variable.id, variable.value]));
  for (let snapshot = 1; snapshot <= index; snapshot += 1) {
    Object.assign(values, snapshots[snapshot]?.values);
  }
  return values;
}

function svgRect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  options: { readonly rx?: number; readonly attributes?: string } = {},
): string {
  return `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="${options.rx ?? 0}" fill="${escapeAttribute(fill)}"${options.attributes ? ` ${options.attributes}` : ""}/>`;
}

function svgText(
  x: number,
  y: number,
  value: string,
  size: number,
  fill: string,
  anchor: "start" | "middle" | "end",
  attributes = "",
): string {
  return `<text x="${x}" y="${y}" fill="${escapeAttribute(fill)}" font-size="${size}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle"${attributes ? ` ${attributes}` : ""}>${escapeText(value)}</text>`;
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function formatNumber(value: number, digits: number): string {
  if (Math.abs(value) < 10 ** (-digits) / 2) return "0";
  return value.toFixed(digits);
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite; received ${value}.`);
  return value;
}

function positive(value: number, label: string): number {
  finite(value, label);
  if (value <= 0) throw new Error(`${label} must be positive; received ${value}.`);
  return value;
}

function nonnegative(value: number, label: string): number {
  finite(value, label);
  if (value < 0) throw new Error(`${label} must be non-negative; received ${value}.`);
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
