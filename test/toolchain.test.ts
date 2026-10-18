import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { ensureChromium, resolveFfmpegBinary } from "../src/render/toolchain.ts";

test("chromium and ffmpeg resolve without a second install", async () => {
  await ensureChromium();
  const ffmpeg = await resolveFfmpegBinary();
  assert.equal(existsSync(ffmpeg), true);
  assert.equal(await resolveFfmpegBinary(), ffmpeg);
});
