import type { Tattva, TattvaState } from "../../core/Tattva.ts";
import type { ColorInput } from "../../core/theme.ts";
import { GroupTattva } from "../layout/Group.ts";
import {
  Ellipse,
  type EllipseTattva,
  VectorShape,
  type VectorShapeTattva,
} from "../primitives/shapes.ts";

export const KAVRIQ_BLUE = "#08a9c4";
export const KAVRIQ_DEEP_BLUE = "#076b8f";
export const KAVRIQ_BACKGROUND = "#f2fbfd";

/** A soft, symmetrical teardrop with enough shoulder to read clearly at favicon sizes. */
export const KAVRIQ_DROP_PATH = [
  "M 0 -1.42",
  "C -0.14 -1.02 -0.96 -0.30 -0.96 0.48",
  "C -0.96 1.08 -0.54 1.48 0 1.48",
  "C 0.54 1.48 0.96 1.08 0.96 0.48",
  "C 0.96 -0.30 0.14 -1.02 0 -1.42",
  "Z",
].join(" ");

const DROP_VIEWBOX = { x: -1.06, y: -1.52, width: 2.12, height: 3.1 } as const;
const DEFAULT_MARK_HEIGHT = 4.8;

export interface KavriqLogoMarkOptions {
  /** Overall height in world units. Defaults to 4.8. */
  readonly height?: number;
  /** Solid brand color. Defaults to Kavriq cyan. */
  readonly color?: ColorInput;
  /** Add the restrained soft shadow used by the showcase exports. */
  readonly shadow?: boolean;
}

/** Kavriq's standalone water-drop mark. */
export function KavriqLogoMark(options: KavriqLogoMarkOptions = {}): VectorShapeTattva {
  const height = positive(options.height ?? DEFAULT_MARK_HEIGHT, "KavriqLogoMark height");
  const mark = VectorShape(KAVRIQ_DROP_PATH, { viewBox: DROP_VIEWBOX })
    .fill(options.color ?? KAVRIQ_BLUE)
    .scale(height / DROP_VIEWBOX.height);
  if (options.shadow !== false) {
    mark.css({ filter: "drop-shadow(0 0.22px 0.34px rgb(7 107 143 / 24%))" });
  }
  return mark;
}

export interface KavriqSplashLogoOptions {
  readonly color?: ColorInput;
}

interface SplashParticle {
  readonly originX: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly delay: number;
  readonly size: number;
  readonly gravity: number;
}

// Deliberately uneven launch speeds keep the splash fluid instead of mirrored
// and mechanical. Every trajectory is still deterministic.
const SPLASH_PARTICLES = [
  { originX: -0.38, velocityX: -3.28, velocityY: 2.18, delay: 0.015, size: 0.72, gravity: 7.7 },
  { originX: -0.29, velocityX: -2.58, velocityY: 3.34, delay: 0, size: 1.02, gravity: 7.5 },
  { originX: -0.19, velocityX: -1.72, velocityY: 4.02, delay: 0.035, size: 0.82, gravity: 8.0 },
  { originX: -0.07, velocityX: -0.72, velocityY: 3.02, delay: 0.075, size: 0.58, gravity: 7.2 },
  { originX: 0.05, velocityX: 0.58, velocityY: 3.48, delay: 0.055, size: 0.64, gravity: 7.6 },
  { originX: 0.17, velocityX: 1.46, velocityY: 4.22, delay: 0.018, size: 0.9, gravity: 8.2 },
  { originX: 0.28, velocityX: 2.38, velocityY: 3.06, delay: 0, size: 1.06, gravity: 7.4 },
  { originX: 0.39, velocityX: 3.18, velocityY: 2.04, delay: 0.028, size: 0.68, gravity: 7.8 },
] as const satisfies readonly SplashParticle[];

/** All vector pieces used by the growing-drop splash ident. */
export class KavriqSplashLogoTattva extends GroupTattva {
  readonly drop: VectorShapeTattva;
  readonly puddle: EllipseTattva;
  readonly splashes: readonly EllipseTattva[];

  constructor(options: KavriqSplashLogoOptions = {}) {
    const color = options.color ?? KAVRIQ_BLUE;
    const drop = VectorShape(KAVRIQ_DROP_PATH, { viewBox: DROP_VIEWBOX })
      .fill(color)
      .at([0, 1.46])
      .scale3D([0.18, 0.18, 1])
      .opacity(0)
      .layer(3)
      .css({ filter: "drop-shadow(0 0.12px 0.22px rgb(7 107 143 / 20%))" });
    const puddle = Ellipse()
      .radii([0.76, 0.14])
      .fill(color)
      .at([0, -1.11])
      .scale3D([0.12, 0.12, 1])
      .opacity(0)
      .layer(1);
    const splashes = SPLASH_PARTICLES.map((particle) =>
      Ellipse()
        .radii([0.075, 0.19])
        .fill(color)
        .at([0, -0.94])
        .scale(particle.size * 0.35)
        .opacity(0)
        .layer(2)
    );
    super([puddle, ...splashes, drop]);
    this.drop = drop;
    this.puddle = puddle;
    this.splashes = splashes;
  }
}

export function KavriqSplashLogo(
  options: KavriqSplashLogoOptions = {},
): KavriqSplashLogoTattva {
  return new KavriqSplashLogoTattva(options);
}

export interface KavriqSplashMotionOptions {
  /** Total duration of the ident. Defaults to 4.2 seconds. */
  readonly duration?: number;
}

export interface KavriqSplashMotion {
  readonly duration: number;
  readonly impactTime: number;
  readonly update: (time: number, states: Map<Tattva<any>, TattvaState>) => void;
}

const REFERENCE_DURATION = 4.2;
const GROW_START = 0.08;
const DETACH_START = 1.34;
const FALL_START = 1.7;
const IMPACT_TIME = 2.25;
const SURFACE_Y = -1.08;
const DETACH_ACCELERATION = 2.4;
const RELEASE_SPEED = 2 * DETACH_ACCELERATION * (FALL_START - DETACH_START);
const FALL_ACCELERATION = 6.58;

/**
 * One continuous, seek-safe water motion: fill → sag → detach → fall → splash.
 *
 * Growth eases into weight-induced sag. The released drop then follows a
 * gravity curve while its area is approximately conserved. At impact, the
 * puddle spreads with a damped ripple and each satellite follows its own
 * ballistic arc before skimming the imaginary surface.
 */
export function KavriqSplashMotion(
  logo: KavriqSplashLogoTattva,
  options: KavriqSplashMotionOptions = {},
): KavriqSplashMotion {
  const duration = positive(options.duration ?? REFERENCE_DURATION, "KavriqSplashMotion duration");
  const impactTime = IMPACT_TIME / REFERENCE_DURATION * duration;

  return {
    duration,
    impactTime,
    update(time, states) {
      const t = clamp(time / duration, 0, 1) * REFERENCE_DURATION;
      const drop = states.get(logo.drop);
      const puddle = states.get(logo.puddle);
      if (drop) applyDropMotion(drop, t);
      if (puddle) applyPuddleMotion(puddle, t);
      logo.splashes.forEach((splash, index) => {
        const state = states.get(splash);
        if (state) applySplashMotion(state, t, SPLASH_PARTICLES[index]!);
      });
    },
  };
}

function applyDropMotion(state: TattvaState, time: number): void {
  state.x = 0;
  state.rotationZ = 0;

  if (time < GROW_START) {
    Object.assign(state, { y: 1.46, scaleX: 0.18, scaleY: 0.18, opacity: 0 });
    return;
  }

  if (time < DETACH_START) {
    const progress = smoothstep((time - GROW_START) / (DETACH_START - GROW_START));
    const scale = mix(0.18, 0.75, progress);
    const weight = smoothstep((progress - 0.48) / 0.52);
    Object.assign(state, {
      y: 1.46 - 0.2 * weight,
      scaleX: scale * (1 - 0.045 * weight),
      scaleY: scale * (1 + 0.08 * weight),
      opacity: smoothstep(Math.min(1, (time - GROW_START) / 0.16)),
    });
    return;
  }

  if (time < FALL_START) {
    const elapsed = time - DETACH_START;
    const progress = elapsed / (FALL_START - DETACH_START);
    const weightedProgress = progress * progress;
    Object.assign(state, {
      y: 1.26 - DETACH_ACCELERATION * elapsed * elapsed,
      scaleX: mix(0.716, 0.61, weightedProgress),
      scaleY: mix(0.81, 0.92, weightedProgress),
      opacity: 1,
    });
    return;
  }

  if (time < IMPACT_TIME) {
    const elapsed = time - FALL_START;
    const fallDuration = IMPACT_TIME - FALL_START;
    const progress = elapsed / fallDuration;
    const scaleY = 0.92 + 0.15 * progress * progress;
    const conservedArea = 0.61 * 0.92;
    Object.assign(state, {
      y: 0.949 - RELEASE_SPEED * elapsed - 0.5 * FALL_ACCELERATION * elapsed * elapsed,
      scaleX: conservedArea / scaleY,
      scaleY,
      opacity: 1,
    });
    return;
  }

  const impact = clamp((time - IMPACT_TIME) / 0.105, 0, 1);
  const compression = 1 - Math.pow(1 - impact, 3);
  Object.assign(state, {
    y: mix(-0.99, SURFACE_Y, compression),
    scaleX: mix(0.525, 1.36, compression),
    scaleY: mix(1.07, 0.12, compression),
    opacity: 1 - smoothstep((impact - 0.04) / 0.38),
  });
}

function applyPuddleMotion(state: TattvaState, time: number): void {
  const elapsed = time - IMPACT_TIME;
  state.x = 0;
  state.y = SURFACE_Y;
  state.rotationZ = 0;
  if (elapsed < 0) {
    Object.assign(state, { scaleX: 0.12, scaleY: 0.12, opacity: 0 });
    return;
  }

  const spread = 1 - Math.exp(-8.5 * elapsed);
  const ripple = Math.exp(-4.2 * elapsed) * Math.sin(15 * elapsed);
  const fade = 1 - smoothstep((elapsed - 1.12) / 0.72);
  Object.assign(state, {
    scaleX: 0.16 + 2.08 * spread,
    scaleY: 0.46 + 0.42 * Math.exp(-5.2 * elapsed) + 0.11 * ripple,
    opacity: clamp(fade, 0, 1) * 0.95,
  });
}

function applySplashMotion(
  state: TattvaState,
  time: number,
  particle: SplashParticle,
): void {
  const elapsed = time - IMPACT_TIME - particle.delay;
  const startY = -0.94;
  if (elapsed < 0) {
    Object.assign(state, {
      x: particle.originX,
      y: startY,
      scaleX: particle.size * 0.35,
      scaleY: particle.size * 0.35,
      opacity: 0,
    });
    return;
  }

  const flightTime = (particle.velocityY + Math.sqrt(
    particle.velocityY ** 2 + 2 * particle.gravity * (startY - SURFACE_Y),
  )) / particle.gravity;

  if (elapsed <= flightTime) {
    const verticalVelocity = particle.velocityY - particle.gravity * elapsed;
    const speedStretch = 1 + Math.min(0.48, Math.hypot(particle.velocityX, verticalVelocity) * 0.065);
    Object.assign(state, {
      x: particle.originX + particle.velocityX * elapsed * (1 - 0.055 * elapsed),
      y: startY + particle.velocityY * elapsed - 0.5 * particle.gravity * elapsed * elapsed,
      rotationZ: Math.atan2(particle.velocityX, verticalVelocity) * 180 / Math.PI,
      scaleX: particle.size / Math.sqrt(speedStretch),
      scaleY: particle.size * speedStretch,
      opacity: smoothstep(Math.min(1, elapsed / 0.055)),
    });
    return;
  }

  const landingX = particle.originX
    + particle.velocityX * flightTime * (1 - 0.055 * flightTime);
  const skid = clamp((elapsed - flightTime) / 0.34, 0, 1);
  Object.assign(state, {
    x: landingX + particle.velocityX * 0.12 * smoothstep(skid),
    y: SURFACE_Y,
    rotationZ: particle.velocityX < 0 ? -88 : 88,
    scaleX: particle.size * mix(0.88, 1.45, skid),
    scaleY: particle.size * mix(0.62, 0.12, skid),
    opacity: 1 - smoothstep(skid),
  });
}

function smoothstep(value: number): number {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}
