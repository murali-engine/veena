import assert from "node:assert/strict";
import test from "node:test";
import {
  KAVRIQ_BLUE,
  KavriqLogoMark,
  KavriqSplashLogo,
  KavriqSplashMotion,
} from "../src/tattvas/composite/kavriq-logo.ts";
import {
  KAVRIQ_SPLASH_3D_DURATION,
  KAVRIQ_SPLASH_3D_IMPACT,
  KavriqSplashLogo3D,
  sampleKavriqSplash3D,
} from "../src/tattvas/composite/kavriq-logo-3d.ts";

test("builds the standalone Kavriq drop at the requested height", () => {
  const mark = KavriqLogoMark({ height: 6, shadow: false });
  assert.equal(mark.initialState.background, KAVRIQ_BLUE);
  assert.ok(Math.abs((mark.worldSize?.height ?? 0) * mark.initialState.scaleY - 6) < 1e-9);
});

test("authors a continuous deterministic Kavriq splash phrase", () => {
  const logo = KavriqSplashLogo();
  const motion = KavriqSplashMotion(logo);
  const tattvas = [logo.drop, logo.puddle, ...logo.splashes];
  const states = new Map(tattvas.map((tattva) => [tattva, { ...tattva.initialState }]));

  assert.equal(logo.splashes.length, 8);
  assert.equal(motion.duration, 4.2);

  motion.update(1.3, states);
  const grownY = states.get(logo.drop)?.y ?? 0;
  const grownScale = states.get(logo.drop)?.scaleX ?? 0;
  motion.update(2.05, states);
  assert.ok((states.get(logo.drop)?.y ?? 0) < grownY);
  assert.ok((states.get(logo.drop)?.scaleX ?? 0) < grownScale);

  motion.update(2.7, states);
  assert.ok((states.get(logo.puddle)?.scaleX ?? 0) > 1);
  assert.ok(logo.splashes.some((splash) => (states.get(splash)?.x ?? 0) < -0.5));
  assert.ok(logo.splashes.some((splash) => (states.get(splash)?.x ?? 0) > 0.5));
});

test("rejects non-positive Kavriq logo dimensions and durations", () => {
  assert.throws(() => KavriqLogoMark({ height: 0 }), /positive finite number/);
  assert.throws(
    () => KavriqSplashMotion(KavriqSplashLogo(), { duration: -1 }),
    /positive finite number/,
  );
});

test("grows, bounces once, falls, and produces a dense 3D particle splash", () => {
  const growing = sampleKavriqSplash3D(0.7);
  const full = sampleKavriqSplash3D(1.45);
  const bouncePeak = sampleKavriqSplash3D(1.8);
  const falling = sampleKavriqSplash3D(2.55);
  const splash = sampleKavriqSplash3D(3.25);

  assert.ok(growing.drop.radialScale < full.drop.radialScale);
  assert.ok(bouncePeak.drop.y > full.drop.y);
  assert.ok(falling.drop.y < full.drop.y);
  assert.equal(splash.particles.length, 48);
  assert.ok(splash.particles.filter((particle) => particle.opacity > 0).length > 28);
  const landed = sampleKavriqSplash3D(KAVRIQ_SPLASH_3D_DURATION);
  assert.ok(landed.particles.every((particle) => particle.opacity === 0));
  assert.ok(KAVRIQ_SPLASH_3D_IMPACT < KAVRIQ_SPLASH_3D_DURATION);
});

test("keeps the 3D drop tip pinned while it grows and bounces", () => {
  const topAt = (time: number): number => {
    const drop = sampleKavriqSplash3D(time).drop;
    return drop.y + 1.34 * drop.verticalScale;
  };

  const hangingTip = topAt(0.4);
  assert.ok(Math.abs(topAt(1.2) - hangingTip) < 1e-9);
  assert.ok(Math.abs(topAt(1.62) - hangingTip) < 1e-9);
  assert.ok(sampleKavriqSplash3D(2.5).drop.y < sampleKavriqSplash3D(2.15).drop.y);
});

test("validates the authored time of the 3D splash tattva", () => {
  assert.throws(() => KavriqSplashLogo3D().time(-0.1), /non-negative/);
  assert.throws(() => KavriqSplashLogo3D().splashRadius(0), /positive finite/);
});

test("keeps particles above ground and inside the configured splash radius", () => {
  const maximum = 2.1;
  for (let time = KAVRIQ_SPLASH_3D_IMPACT; time <= KAVRIQ_SPLASH_3D_DURATION; time += 0.025) {
    for (const particle of sampleKavriqSplash3D(time, { maxSplashRadius: maximum }).particles) {
      assert.ok(particle.y >= -1.08 - 1e-9);
      assert.ok(Math.hypot(particle.x, particle.z) <= maximum + 1e-9);
    }
  }
});
