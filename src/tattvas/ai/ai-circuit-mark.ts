import type { Tattva, TattvaState, Vec2 } from "../../core/Tattva.ts";
import type { ColorInput } from "../../core/theme.ts";
import { GroupTattva } from "../layout/Group.ts";
import { Path, type PathTattva } from "../primitives/paths.ts";
import {
  Circle,
  type CircleTattva,
  Label,
  type LabelTattva,
  Rectangle,
  type RectangleTattva,
} from "../primitives/shapes.ts";

export const AI_CIRCUIT_BLUE = "#1557a6";
export const AI_CIRCUIT_GOLD = "#f2a20b";
export const AI_CIRCUIT_SURFACE = "#fffdf8";

const DEFAULT_MARK_SIZE = 7.2;
const TRACE_BOUNDS = { x: -3.15, y: -3.15, width: 6.3, height: 6.3 } as const;

export interface AICircuitMarkOptions {
  /** Overall diameter in world units. Defaults to 7.2. */
  readonly size?: number;
  /** Circuit, node, and chip-outline color. */
  readonly circuitColor?: ColorInput;
  /** Core and halo color. */
  readonly accentColor?: ColorInput;
  /** Disc, chip, and open-node fill. */
  readonly surfaceColor?: ColorInput;
  /** Text shown in the processor core. Defaults to "AI". */
  readonly label?: string;
  /** Show the soft outer halo. Defaults to true. */
  readonly halo?: boolean;
}

interface CircuitRoute {
  readonly points: readonly Vec2[];
  readonly open?: boolean;
  readonly terminalRadius?: number;
}

const ROUTES: readonly CircuitRoute[] = circuitRoutes();

/**
 * An original AI emblem inspired by processor diagrams: a warm core surrounded
 * by a symmetrical field of circuit traces. It is vector-authored, themeable,
 * and safe to scale for titles, explainers, or compact topic badges.
 */
export class AICircuitMarkTattva extends GroupTattva {
  readonly aura: CircleTattva;
  readonly halo: CircleTattva;
  readonly disc: CircleTattva;
  readonly traces: PathTattva;
  readonly pins: PathTattva;
  readonly nodes: readonly CircleTattva[];
  readonly chip: RectangleTattva;
  readonly core: CircleTattva;
  readonly label: LabelTattva;

  constructor(options: AICircuitMarkOptions = {}) {
    const size = positive(options.size ?? DEFAULT_MARK_SIZE, "AICircuitMark size");
    const circuit = options.circuitColor ?? AI_CIRCUIT_BLUE;
    const accent = options.accentColor ?? AI_CIRCUIT_GOLD;
    const surface = options.surfaceColor ?? AI_CIRCUIT_SURFACE;

    const showHalo = options.halo !== false;
    const aura = Circle().radius(3.5).fill(accent).opacity(showHalo ? 0.1 : 0)
      .layer(0).css({ filter: "blur(0.32px)" });
    const halo = Circle().radius(3.3).fill(accent).opacity(showHalo ? 0.22 : 0)
      .layer(1).css({ filter: "blur(0.14px)" });
    const disc = Circle().radius(3.02).fill(surface).layer(2)
      .css({ filter: "drop-shadow(0 0.12px 0.18px rgb(21 87 166 / 12%))" });
    const traces = Path(routesPath(ROUTES), { bounds: TRACE_BOUNDS })
      .stroke({ color: circuit, width: 0.082 }).layer(3);
    const pins = Path(pinPath(ROUTES), { bounds: TRACE_BOUNDS })
      .stroke({ color: circuit, width: 0.16 }).layer(4);
    const nodes = ROUTES.map((route) => {
      const [x, y] = route.points.at(-1)!;
      const node = Circle().radius(route.terminalRadius ?? 0.085).at([x, y]).layer(5);
      return "open" in route && route.open
        ? node.fill(surface).stroke({ color: circuit, width: 0.055 })
        : node.fill(circuit);
    });
    const chip = Rectangle().size([2.2, 2.2]).cornerRadius(0.28).fill(surface)
      .stroke({ color: circuit, width: 0.115 }).layer(6)
      .css({ filter: "drop-shadow(0 0.1px 0.12px rgb(21 87 166 / 16%))" });
    const core = Circle().radius(0.73).fill(surface).stroke({ color: accent, width: 0.065 }).layer(8)
      .css({ filter: "drop-shadow(0 0 0.14px rgb(242 162 11 / 38%))" });
    const label = Label(options.label ?? "AI").height(0.72)
      .font("Georgia", "Times New Roman", "serif").fontWeight(600).color(accent).layer(9);

    super([
      aura, halo, disc, traces, pins, ...nodes, chip, core, label,
    ]);
    this.aura = aura;
    this.halo = halo;
    this.disc = disc;
    this.traces = traces;
    this.pins = pins;
    this.nodes = nodes;
    this.chip = chip;
    this.core = core;
    this.label = label;
    this.recomputeBounds();
    this.scale(size / (this.worldSize?.width ?? size));
  }
}

export function AICircuitMark(options: AICircuitMarkOptions = {}): AICircuitMarkTattva {
  return new AICircuitMarkTattva(options);
}

export interface AICircuitPulseOptions {
  /** Length of one seamless activity cycle. Defaults to 3.6 seconds. */
  readonly duration?: number;
}

export interface AICircuitPulseMotion {
  readonly duration: number;
  readonly update: (time: number, states: Map<Tattva<any>, TattvaState>) => void;
}

/** A seek-safe, seamless pulse that sends activity around the circuit nodes. */
export function AICircuitPulse(
  mark: AICircuitMarkTattva,
  options: AICircuitPulseOptions = {},
): AICircuitPulseMotion {
  const duration = positive(options.duration ?? 3.6, "AICircuitPulse duration");
  return {
    duration,
    update(time, states) {
      const phase = ((time % duration) + duration) % duration / duration;
      mark.nodes.forEach((node, index) => {
        const state = states.get(node);
        if (!state) return;
        const wave = 0.5 + 0.5 * Math.sin((phase - index / mark.nodes.length) * Math.PI * 2);
        // Terminal semantics must remain legible throughout the pulse: a head
        // never fades into what looks like an unfinished circuit trace.
        state.opacity = 0.84 + wave * 0.16;
        state.scaleX = 0.96 + wave * 0.1;
        state.scaleY = state.scaleX;
      });

      const breath = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2 - Math.PI / 2);
      const core = states.get(mark.core);
      if (core) core.scaleX = core.scaleY = 1 + breath * 0.045;
      const halo = states.get(mark.halo);
      if (halo && mark.halo.initialState.opacity > 0) halo.opacity = 0.24 + breath * 0.13;
      const aura = states.get(mark.aura);
      if (aura && mark.aura.initialState.opacity > 0) aura.opacity = 0.07 + breath * 0.08;
    },
  };
}

function routesPath(routes: readonly CircuitRoute[]): string {
  return routes.map(({ points }) => points.map(([x, y], index) =>
    `${index === 0 ? "M" : "L"} ${x} ${-y}`
  ).join(" ")).join(" ");
}

function circuitRoutes(): readonly CircuitRoute[] {
  const chipOffsets = [-0.84, -0.6, -0.36, -0.12, 0.12, 0.36, 0.6, 0.84] as const;
  const horizontalTerminals = [-1.14, -0.82, -0.5, -0.2, 0.16, 0.46, 0.82, 1.14] as const;
  const horizontalReach = [2.18, 2.46, 2.12, 1.78, 1.72, 2.08, 2.42, 2.2] as const;
  const verticalTerminals = [-1.22, -0.86, -0.54, -0.22, 0.12, 0.42, 0.78, 1.16] as const;
  const verticalReach = [2.08, 2.42, 2.14, 1.76, 1.92, 2.48, 2.3, 2.08] as const;
  const horizontalOpen = [false, true, false, false, true, true, false, false] as const;
  const verticalOpen = [false, true, false, false, true, false, true, false] as const;
  const horizontalRadii = [0.07, 0.14, 0.075, 0.065, 0.105, 0.125, 0.09, 0.07] as const;
  const verticalRadii = [0.07, 0.14, 0.075, 0.06, 0.105, 0.085, 0.12, 0.07] as const;
  const routes: CircuitRoute[] = [];

  for (const direction of [-1, 1] as const) {
    chipOffsets.forEach((offset, index) => {
      const terminal = horizontalTerminals[index]!;
      const reach = horizontalReach[index]!;
      routes.push({
        points: [
          [direction * 1.36, offset],
          [direction * (1.52 + index % 3 * 0.055), offset],
          [direction * (1.74 + index % 2 * 0.09), terminal],
          [direction * reach, terminal],
        ],
        open: horizontalOpen[direction > 0 ? 7 - index : index],
        terminalRadius: horizontalRadii[direction > 0 ? 7 - index : index],
      });
    });
  }

  for (const direction of [1, -1] as const) {
    chipOffsets.forEach((offset, index) => {
      const terminal = verticalTerminals[index]!;
      const reach = verticalReach[index]!;
      routes.push({
        points: [
          [offset, direction * 1.36],
          [offset, direction * (1.52 + (7 - index) % 3 * 0.055)],
          [terminal, direction * (1.74 + index % 2 * 0.09)],
          [terminal, direction * reach],
        ],
        open: verticalOpen[direction < 0 ? 7 - index : index],
        terminalRadius: verticalRadii[direction < 0 ? 7 - index : index],
      });
    });
  }

  return routes;
}

function pinPath(routes: readonly CircuitRoute[]): string {
  return routes.map(({ points }) => {
    const [x, y] = points[0]!;
    const horizontal = Math.abs(x) > Math.abs(y);
    const innerX = horizontal ? Math.sign(x) * 1.24 : x;
    const innerY = horizontal ? y : Math.sign(y) * 1.24;
    return `M ${innerX} ${-innerY} L ${x} ${-y}`;
  }).join(" ");
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}
