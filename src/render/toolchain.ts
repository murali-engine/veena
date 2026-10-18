import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

interface BrowserExecutable {
  executablePath(): string | undefined;
}

interface PlaywrightRegistryModule {
  registry: {
    findExecutable(name: string): BrowserExecutable;
  };
  installBrowsersForNpmInstall(browsers: string[]): Promise<boolean>;
}

const browserNames = ["chromium", "chromium-headless-shell"] as const;

let chromiumReady: Promise<void> | undefined;
let ffmpegReady: Promise<string> | undefined;

/** Download Playwright's Chromium when install scripts did not. */
export function ensureChromium(): Promise<void> {
  chromiumReady ??= ensureChromiumOnce();
  return chromiumReady;
}

/** Return ffmpeg-static's binary, downloading it when install scripts did not. */
export function resolveFfmpegBinary(): Promise<string> {
  ffmpegReady ??= resolveFfmpegOnce();
  return ffmpegReady;
}

async function ensureChromiumOnce(): Promise<void> {
  const playwright = require("playwright-core/lib/coreBundle") as { registry: PlaywrightRegistryModule };
  if (browserNames.every((name) => browserExists(playwright, name))) return;
  if (skipBrowserDownload()) return;
  process.stderr.write("Downloading Playwright Chromium. This happens once per machine.\n");
  await playwright.registry.installBrowsersForNpmInstall([...browserNames]);
}

async function resolveFfmpegOnce(): Promise<string> {
  const ffmpegStatic = require("ffmpeg-static") as string | null;
  if (!ffmpegStatic) return "ffmpeg";
  if (existsSync(ffmpegStatic)) return ffmpegStatic;
  process.stderr.write("Downloading FFmpeg. This happens once per install.\n");
  await run(process.execPath, [require.resolve("ffmpeg-static/install.js")]);
  if (!existsSync(ffmpegStatic)) {
    throw new Error(`FFmpeg was not downloaded to ${ffmpegStatic}.`);
  }
  return ffmpegStatic;
}

function browserExists(playwright: { registry: PlaywrightRegistryModule }, name: string): boolean {
  const executable = playwright.registry.registry.findExecutable(name).executablePath();
  return typeof executable === "string" && existsSync(executable);
}

function skipBrowserDownload(): boolean {
  const value = process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD;
  return value !== undefined && value !== "" && value !== "0" && value !== "false";
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code ?? "no code"}.`));
    });
  });
}
