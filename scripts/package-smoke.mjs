import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "veena-package-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmEnvironment = { ...process.env, npm_config_cache: join(temporaryDirectory, "npm-cache") };

execFileSync(npmCommand, ["run", "build"], { cwd: resolve("."), stdio: "inherit", env: npmEnvironment });
execFileSync(npmCommand, ["test"], { cwd: resolve("."), stdio: "inherit", env: npmEnvironment });
const packResult = JSON.parse(execFileSync(npmCommand, ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryDirectory], {
  cwd: resolve("."),
  encoding: "utf8",
  env: npmEnvironment,
}));
const tarball = join(temporaryDirectory, packResult[0].filename);

writeFileSync(join(temporaryDirectory, "package.json"), JSON.stringify({
  private: true,
  type: "module",
  dependencies: { "veena-engine": `file:${tarball}` },
}));
execFileSync(npmCommand, ["install", "--ignore-scripts"], { cwd: temporaryDirectory, stdio: "inherit", env: npmEnvironment });
const installedTypes = JSON.parse(readFileSync(join(temporaryDirectory, "node_modules/@types/node/package.json"), "utf8"));
if (!String(installedTypes.version).startsWith("26.")) {
  throw new Error(`Consumers must see a modern @types/node, found ${installedTypes.version}`);
}
const ffmpegBinaryName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
const ffmpegBinary = join(temporaryDirectory, "node_modules/ffmpeg-static", ffmpegBinaryName);
if (existsSync(ffmpegBinary)) {
  throw new Error("ignore-scripts install unexpectedly produced an FFmpeg binary");
}
writeFileSync(join(temporaryDirectory, "hello.ts"), `
import { Scene } from "veena-engine/core";
import { Circle } from "veena-engine/primitives";

export default class Hello extends Scene {
  override construct() {
    this.add(Circle().radius(1).fill("#7c3aed"));
    this.wait(0.1);
  }
}
`);
execFileSync(process.execPath, [
  join(temporaryDirectory, "node_modules/tsx/dist/cli.mjs"),
  "hello.ts",
], { cwd: temporaryDirectory, stdio: "inherit", env: npmEnvironment });
execFileSync(process.execPath, [
  join(temporaryDirectory, "node_modules/typescript/bin/tsc"),
  "--noEmit",
  "--strict",
  "--module", "nodenext",
  "--moduleResolution", "nodenext",
  "--target", "es2022",
  "--lib", "es2022,dom",
  "--skipLibCheck",
  "hello.ts",
], { cwd: temporaryDirectory, stdio: "inherit", env: npmEnvironment });
execFileSync(process.execPath, [
  join(temporaryDirectory, "node_modules/veena-engine/dist/cli.js"),
  "render",
  "hello.ts",
  "-o", "output/hello.mp4",
], { cwd: temporaryDirectory, stdio: "inherit", env: npmEnvironment });
const mp4 = readFileSync(join(temporaryDirectory, "output/hello.mp4"));
if (mp4.subarray(4, 8).toString("ascii") !== "ftyp") {
  throw new Error("Installed package did not write an MP4");
}
if (!existsSync(ffmpegBinary)) {
  throw new Error("Rendering did not download FFmpeg after a script-skipped install");
}
writeFileSync(join(temporaryDirectory, "smoke.mjs"), `
  import { BasisExplorer2D, Camera3D, Circle, Ellipse, FormulaMorph, FormulaOutline, Label, Latex, LatexMorph, LinearMap2D, Matrix, Opening, ProjectionDiagram2D, Scene, ShapeMorph, TextMorph, ThreeTattva, Timeline, VectorShape, WordCloud, createTheme, render, palette, themes } from "veena-engine";
  import { Scene as CoreScene } from "veena-engine/core";
  import { palette as stylePalette } from "veena-engine/style";
  import { ThreeTattva as AdapterThreeTattva } from "veena-engine/adapters";
  import { Group } from "veena-engine/layout";
  import { Circle as PrimitiveCircle } from "veena-engine/primitives";
  import { Label as TextLabel } from "veena-engine/text";
  import { Matrix as MathsMatrix } from "veena-engine/maths";
  import { NeuralNetwork } from "veena-engine/ai";
  import { WaveMesh } from "veena-engine/composite";
  import { Stepwise } from "veena-engine/storytelling";
  import { Table } from "veena-engine/table";
  import { TracedPath } from "veena-engine/utility";
  import { renderScene } from "veena-engine/render";
  if ([BasisExplorer2D, Circle, Ellipse, FormulaMorph, FormulaOutline, Label, Latex, LatexMorph, LinearMap2D, Matrix, Opening, ProjectionDiagram2D, Scene, ShapeMorph, TextMorph, ThreeTattva, Timeline, VectorShape, WordCloud, createTheme, render, renderScene, CoreScene, AdapterThreeTattva, Group, PrimitiveCircle, TextLabel, MathsMatrix, NeuralNetwork, WaveMesh, Stepwise, Table, TracedPath].some((value) => typeof value !== "function") || typeof Camera3D.perspective !== "function" || themes.dark.colors.accent.length === 0 || palette.TEAL_C.length === 0 || stylePalette.TEAL_C.length === 0) {
    throw new Error("Published exports are incomplete");
  }
`);
execFileSync(process.execPath, [join(temporaryDirectory, "smoke.mjs")], { stdio: "inherit" });

const manifest = JSON.parse(readFileSync(join(temporaryDirectory, "node_modules/veena-engine/package.json"), "utf8"));
process.stdout.write(`Verified installed package ${manifest.name}@${manifest.version}\n`);
