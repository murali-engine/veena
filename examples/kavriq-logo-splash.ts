import { render } from "veena-engine";
import {
  KAVRIQ_BACKGROUND,
  KAVRIQ_SPLASH_3D_DURATION,
  KavriqSplashLogo3D,
} from "veena-engine/composite";
import { Scene, Timeline } from "veena-engine/core";

const settings = splashSettings();

class KavriqLogoSplash extends Scene {
  constructor() {
    super({ frame: "square", width: 1080, height: 1080, background: settings.background });
  }

  override construct(): void {
    this.camera
      .perspective({ fov: 42, near: 0.1, far: 80 })
      .position([4.8, 2.8, 8.7])
      .lookAt([0, 0.12, 0]);

    const logo = this.add(KavriqSplashLogo3D({
      color: settings.color,
      maxSplashRadius: settings.maxSplashRadius,
    }));
    const motion = new Timeline();
    motion.animate(logo).duration(KAVRIQ_SPLASH_3D_DURATION).ease("linear")
      .to({ time: KAVRIQ_SPLASH_3D_DURATION });
    motion.animateCamera(this.camera).duration(KAVRIQ_SPLASH_3D_DURATION).ease("inOutCubic")
      .frameTo([-3.8, 2.6, 8.8], [0, 0.05, 0]);
    this.play(motion);

    this.captureGifRange("kavriq-logo-splash", {
      from: 0,
      to: KAVRIQ_SPLASH_3D_DURATION,
      fps: 24,
    });
    this.captureScreenshotsNamed([
      [1.42, "kavriq-logo-grown.png"],
      [1.62, "kavriq-logo-bounce.png"],
      [2.56, "kavriq-logo-fall.png"],
      [2.96, "kavriq-logo-impact.png"],
      [3.42, "kavriq-logo-splash.png"],
    ]);
  }
}

render(import.meta.url, KavriqLogoSplash, {
  output: settings.output,
  fps: 60,
  transparent: settings.transparent,
  args: {
    background: settings.background,
    color: settings.color,
    maxSplashRadius: String(settings.maxSplashRadius),
  },
});

interface SplashSettings {
  readonly background: string;
  readonly color: string;
  readonly maxSplashRadius: number;
  readonly output: string;
  readonly transparent: boolean;
}

function splashSettings(): SplashSettings {
  const injected = (globalThis as {
    __veenaArgs?: {
      background?: string;
      color?: string;
      maxSplashRadius?: string;
    };
  }).__veenaArgs;
  if (injected) {
    return {
      background: injected.background ?? KAVRIQ_BACKGROUND,
      color: injected.color ?? "#08a9c4",
      maxSplashRadius: Number(injected.maxSplashRadius ?? 2.5),
      output: "./output/kavriq-logo-splash.mp4",
      transparent: false,
    };
  }

  const argv = typeof process === "undefined" ? [] : process.argv.slice(2);
  const transparent = booleanArgument(argv, "--transparent");
  const radius = Number(argumentValue(argv, "--splash-radius") ?? 2.5);
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error(`--splash-radius must be a positive number; received ${radius}.`);
  }
  return {
    background: argumentValue(argv, "--background") ?? KAVRIQ_BACKGROUND,
    color: argumentValue(argv, "--color") ?? "#08a9c4",
    maxSplashRadius: radius,
    output: argumentValue(argv, "--output")
      ?? `./output/kavriq-logo-splash.${transparent ? "webm" : "mp4"}`,
    transparent,
  };
}

function booleanArgument(argv: readonly string[], name: string): boolean {
  if (argv.includes(name)) return true;
  const value = argumentValue(argv, name)?.toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function argumentValue(argv: readonly string[], name: string): string | undefined {
  const equals = argv.find((argument) => argument.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] && !argv[index + 1]!.startsWith("--")
    ? argv[index + 1]
    : undefined;
}
