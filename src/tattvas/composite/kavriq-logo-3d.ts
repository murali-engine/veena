import * as THREE from "three";
import { ThreeTattva } from "../../core/ThreeTattva.ts";
import type { TattvaState } from "../../core/Tattva.ts";
import { KAVRIQ_BLUE } from "./kavriq-logo.ts";

export interface KavriqSplash3DState extends TattvaState {
  /** Time within the 3D water ident, in seconds. */
  time: number;
}

export interface KavriqSplash3DOptions {
  readonly color?: string;
  /** Furthest radial distance reached by splash droplets. Defaults to 2.5 world units. */
  readonly maxSplashRadius?: number;
}

export interface KavriqSplash3DSampleOptions {
  readonly maxSplashRadius?: number;
}

export interface KavriqDrop3DPose {
  readonly y: number;
  readonly radialScale: number;
  readonly verticalScale: number;
  readonly opacity: number;
}

export interface KavriqParticle3DPose {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly size: number;
  readonly stretch: number;
  readonly opacity: number;
}

export interface KavriqSplash3DSample {
  readonly drop: KavriqDrop3DPose;
  readonly particles: readonly KavriqParticle3DPose[];
}

export const KAVRIQ_SPLASH_3D_DURATION = 5.2;
export const KAVRIQ_SPLASH_3D_IMPACT = 2.82;

const GROW_START = 0.08;
const GROW_END = 1.45;
const BOUNCE_END = 2.15;
const SURFACE_Y = -1.08;
const IMPACT_DROP_Y = -0.28;
const BASE_DROP_SCALE = 0.82;
const DROP_TOP_Y = 1.34;
const HANGING_TIP_Y = 2.52;
const BOUNCE_DURATION = BOUNCE_END - GROW_END;
const RELEASE_Y = HANGING_TIP_Y - DROP_TOP_Y * BASE_DROP_SCALE;
const RELEASE_SPEED = -0.35;
const FALL_DURATION = KAVRIQ_SPLASH_3D_IMPACT - BOUNCE_END;
const FALL_ACCELERATION = 2 * (
  RELEASE_Y + RELEASE_SPEED * FALL_DURATION - IMPACT_DROP_Y
) / (FALL_DURATION * FALL_DURATION);
const PARTICLE_COUNT = 48;
const DEFAULT_SPLASH_RADIUS = 2.5;

interface ParticleSpec {
  readonly angle: number;
  readonly originRadius: number;
  readonly horizontalSpeed: number;
  readonly verticalSpeed: number;
  readonly delay: number;
  readonly size: number;
  readonly gravity: number;
}

interface KavriqSplash3DRuntime {
  readonly drop: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  readonly particles: readonly THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[];
}

/** A lit, translucent 3D water-drop ident with crown and satellite splash. */
export class KavriqSplashLogo3DTattva extends ThreeTattva<KavriqSplash3DState> {
  private readonly splashConfig: { maxSplashRadius: number };

  constructor(options: KavriqSplash3DOptions = {}) {
    const color = options.color ?? KAVRIQ_BLUE;
    const splashConfig = {
      maxSplashRadius: positive(
        options.maxSplashRadius ?? DEFAULT_SPLASH_RADIUS,
        "Kavriq 3D maximum splash radius",
      ),
    };
    let runtime: KavriqSplash3DRuntime | undefined;
    super({
      setup({ scene }) {
        runtime = createRuntime(scene, color);
      },
      update(_context, state) {
        if (runtime) applySample(runtime, sampleKavriqSplash3D(state.time, splashConfig));
      },
    }, { state: { time: 0 } });
    this.splashConfig = splashConfig;
    this.worldSize = { width: 9, height: 7 };
  }

  time(value: number): this {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Kavriq 3D splash time must be finite and non-negative; received ${value}.`);
    }
    return this.set({ time: value });
  }

  /** Limit how far droplets scatter from the impact center. */
  splashRadius(value: number): this {
    this.splashConfig.maxSplashRadius = positive(value, "Kavriq 3D maximum splash radius");
    return this;
  }
}

export function KavriqSplashLogo3D(
  options: KavriqSplash3DOptions = {},
): KavriqSplashLogo3DTattva {
  return new KavriqSplashLogo3DTattva(options);
}

/** Deterministic physical pose used by the renderer and tests. */
export function sampleKavriqSplash3D(
  time: number,
  options: KavriqSplash3DSampleOptions = {},
): KavriqSplash3DSample {
  const t = clamp(time, 0, KAVRIQ_SPLASH_3D_DURATION);
  const maxSplashRadius = positive(
    options.maxSplashRadius ?? DEFAULT_SPLASH_RADIUS,
    "Kavriq 3D maximum splash radius",
  );
  return {
    drop: sampleDrop(t),
    particles: PARTICLE_SPECS.map((spec) => sampleParticle(t, spec, maxSplashRadius)),
  };
}

function sampleDrop(time: number): KavriqDrop3DPose {
  if (time < GROW_START) {
    return {
      y: HANGING_TIP_Y - DROP_TOP_Y * 0.12,
      radialScale: 0.12,
      verticalScale: 0.12,
      opacity: 0,
    };
  }
  if (time < GROW_END) {
    const progress = smoothstep((time - GROW_START) / (GROW_END - GROW_START));
    const scale = mix(0.12, BASE_DROP_SCALE, progress);
    const weight = smoothstep((progress - 0.46) / 0.54);
    const verticalScale = scale * (1 + 0.07 * weight);
    return {
      // The attachment point stays fixed while the added water grows downward.
      y: HANGING_TIP_Y - DROP_TOP_Y * verticalScale,
      radialScale: scale / Math.sqrt(1 + 0.07 * weight),
      verticalScale,
      opacity: smoothstep((time - GROW_START) / 0.16),
    };
  }
  if (time < BOUNCE_END) {
    const progress = (time - GROW_END) / BOUNCE_DURATION;
    const envelope = Math.sin(Math.PI * progress);
    const oscillation = 0.14 * Math.sin(Math.PI * 2 * progress) * envelope;
    const verticalScale = BASE_DROP_SCALE * (1 + oscillation);
    return {
      // The bottom oscillates once while the top remains attached.
      y: HANGING_TIP_Y - DROP_TOP_Y * verticalScale,
      radialScale: Math.sqrt(BASE_DROP_SCALE ** 3 / verticalScale),
      verticalScale,
      opacity: 1,
    };
  }
  if (time < KAVRIQ_SPLASH_3D_IMPACT) {
    const elapsed = time - BOUNCE_END;
    const progress = elapsed / FALL_DURATION;
    const verticalScale = BASE_DROP_SCALE + 0.24 * progress * progress;
    return {
      y: RELEASE_Y + RELEASE_SPEED * elapsed - 0.5 * FALL_ACCELERATION * elapsed * elapsed,
      radialScale: Math.sqrt(BASE_DROP_SCALE ** 3 / verticalScale),
      verticalScale,
      opacity: 1,
    };
  }
  const impact = clamp((time - KAVRIQ_SPLASH_3D_IMPACT) / 0.105, 0, 1);
  const compression = 1 - Math.pow(1 - impact, 3);
  return {
    y: mix(IMPACT_DROP_Y, SURFACE_Y + 0.05, compression),
    radialScale: mix(0.72, 1.55, compression),
    verticalScale: mix(1.06, 0.08, compression),
    opacity: 1 - smoothstep((impact - 0.04) / 0.38),
  };
}

function sampleParticle(
  time: number,
  spec: ParticleSpec,
  maxSplashRadius: number,
): KavriqParticle3DPose {
  const elapsed = time - KAVRIQ_SPLASH_3D_IMPACT - spec.delay;
  const originX = Math.cos(spec.angle) * spec.originRadius;
  const originZ = Math.sin(spec.angle) * spec.originRadius;
  if (elapsed < 0) {
    return { x: originX, y: SURFACE_Y + 0.08, z: originZ, size: spec.size, stretch: 0.2, opacity: 0 };
  }
  const landingTime = (spec.verticalSpeed + Math.sqrt(
    spec.verticalSpeed ** 2 + 2 * spec.gravity * 0.12,
  )) / spec.gravity;
  if (elapsed <= landingTime) {
    const verticalVelocity = spec.verticalSpeed - spec.gravity * elapsed;
    const stretch = 1 + Math.min(1.15, Math.hypot(spec.horizontalSpeed, verticalVelocity) * 0.13);
    const travel = boundedTravel(
      spec.originRadius,
      spec.horizontalSpeed * elapsed * (1 - 0.04 * elapsed),
      maxSplashRadius,
    );
    return {
      x: Math.cos(spec.angle) * travel,
      y: Math.max(
        SURFACE_Y,
        SURFACE_Y + 0.12 + spec.verticalSpeed * elapsed - 0.5 * spec.gravity * elapsed * elapsed,
      ),
      z: Math.sin(spec.angle) * travel,
      size: spec.size,
      stretch,
      opacity: smoothstep(elapsed / 0.045),
    };
  }
  const landingTravel = boundedTravel(
    spec.originRadius,
    spec.horizontalSpeed * landingTime * (1 - 0.04 * landingTime),
    maxSplashRadius,
  );
  return {
    x: Math.cos(spec.angle) * landingTravel,
    y: SURFACE_Y,
    z: Math.sin(spec.angle) * landingTravel,
    size: spec.size,
    stretch: 0.1,
    opacity: 0,
  };
}

/** Smoothly saturate radial travel so limiting distance never creates a visible stop. */
function boundedTravel(origin: number, travel: number, maximum: number): number {
  const room = Math.max(0.001, maximum - origin);
  return origin + room * (1 - Math.exp(-Math.max(0, travel) / room));
}

function createRuntime(scene: THREE.Scene, color: string): KavriqSplash3DRuntime {
  const waterMaterial = () => new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });

  const drop = new THREE.Mesh(dropGeometry(), waterMaterial());
  scene.add(drop);
  const particles = PARTICLE_SPECS.map(() => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), waterMaterial());
    scene.add(mesh);
    return mesh;
  });
  return { drop, particles };
}

function applySample(runtime: KavriqSplash3DRuntime, sample: KavriqSplash3DSample): void {
  const { drop } = sample;
  runtime.drop.position.set(0, drop.y, 0);
  runtime.drop.scale.set(drop.radialScale, drop.verticalScale, drop.radialScale);
  runtime.drop.material.opacity = drop.opacity;
  runtime.drop.visible = drop.opacity > 0.002;

  runtime.particles.forEach((mesh, index) => {
    const pose = sample.particles[index]!;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.scale.set(pose.size, pose.size * pose.stretch, pose.size);
    mesh.material.opacity = pose.opacity;
    mesh.visible = pose.opacity > 0.002;
  });
}

function dropGeometry(): THREE.LatheGeometry {
  const control = [
    new THREE.Vector2(0, -1.02),
    new THREE.Vector2(0.42, -0.94),
    new THREE.Vector2(0.7, -0.62),
    new THREE.Vector2(0.79, -0.15),
    new THREE.Vector2(0.7, 0.34),
    new THREE.Vector2(0.48, 0.72),
    new THREE.Vector2(0.25, 1.02),
    new THREE.Vector2(0, 1.34),
  ];
  const curve = new THREE.SplineCurve(control);
  const points = curve.getPoints(34);
  points[0]!.x = 0;
  points[points.length - 1]!.x = 0;
  const geometry = new THREE.LatheGeometry(points, 72);
  geometry.computeVertexNormals();
  return geometry;
}

const PARTICLE_SPECS = Object.freeze(Array.from({ length: PARTICLE_COUNT }, (_, index): ParticleSpec => {
  const angleStep = Math.PI * 2 / PARTICLE_COUNT;
  return {
    angle: index * angleStep + (hash01(index * 11.7 + 2.4) - 0.5) * angleStep * 0.72,
    originRadius: 0.2 + hash01(index * 7.3 + 1.1) * 0.28,
    horizontalSpeed: 1.65 + hash01(index * 13.1 + 3.7) * 3.0,
    verticalSpeed: 2.1 + hash01(index * 19.7 + 5.2) * 3.5,
    delay: hash01(index * 5.9 + 8.3) * 0.15,
    size: 0.035 + hash01(index * 23.3 + 4.6) * 0.085,
    gravity: 7.2 + hash01(index * 17.1 + 7.4) * 1.7,
  };
}));

function hash01(value: number): number {
  const raw = Math.sin(value * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
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
