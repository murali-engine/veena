import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
  dependencies: { "veena": `file:${tarball}` },
}));
execFileSync(npmCommand, ["install", "--ignore-scripts"], { cwd: temporaryDirectory, stdio: "inherit", env: npmEnvironment });
writeFileSync(join(temporaryDirectory, "smoke.mjs"), `
  import { BasisExplorer2D, Camera3D, Circle, Ellipse, FormulaMorph, FormulaOutline, Label, Latex, LatexMorph, LinearMap2D, Matrix, Opening, ProjectionDiagram2D, Scene, ShapeMorph, TextMorph, ThreeTattva, Timeline, VectorShape, WordCloud, createTheme, render, palette, themes } from "veena";
  import { Scene as CoreScene } from "veena/core";
  import { palette as stylePalette } from "veena/style";
  import { ThreeTattva as AdapterThreeTattva } from "veena/adapters";
  import { Group } from "veena/layout";
  import { Circle as PrimitiveCircle } from "veena/primitives";
  import { Label as TextLabel } from "veena/text";
  import { Matrix as MathsMatrix } from "veena/maths";
  import { NeuralNetwork } from "veena/ai";
  import { WaveMesh } from "veena/composite";
  import { Stepwise } from "veena/storytelling";
  import { Table } from "veena/table";
  import { TracedPath } from "veena/utility";
  import { renderScene } from "veena/render";
  if ([BasisExplorer2D, Circle, Ellipse, FormulaMorph, FormulaOutline, Label, Latex, LatexMorph, LinearMap2D, Matrix, Opening, ProjectionDiagram2D, Scene, ShapeMorph, TextMorph, ThreeTattva, Timeline, VectorShape, WordCloud, createTheme, render, renderScene, CoreScene, AdapterThreeTattva, Group, PrimitiveCircle, TextLabel, MathsMatrix, NeuralNetwork, WaveMesh, Stepwise, Table, TracedPath].some((value) => typeof value !== "function") || typeof Camera3D.perspective !== "function" || themes.dark.colors.accent.length === 0 || palette.TEAL_C.length === 0 || stylePalette.TEAL_C.length === 0) {
    throw new Error("Published exports are incomplete");
  }
`);
execFileSync(process.execPath, [join(temporaryDirectory, "smoke.mjs")], { stdio: "inherit" });

const manifest = JSON.parse(readFileSync(join(temporaryDirectory, "node_modules/veena/package.json"), "utf8"));
process.stdout.write(`Verified installed package ${manifest.name}@${manifest.version}\n`);
