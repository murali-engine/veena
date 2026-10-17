import assert from "node:assert/strict";
import { test } from "node:test";
import { PageTurn, Scene, Timeline } from "../src/index.ts";

class EmptyScene extends Scene {
  constructor(background: string) {
    super({ width: 640, height: 360, background });
  }

  override construct(): void {
    this.wait(2);
  }
}

class TransitionScene extends Scene {
  readonly turn;

  constructor(direction: "left" | "right" = "left") {
    super({ width: 640, height: 360, background: "#000000" });
    this.turn = PageTurn(
      new EmptyScene("#fff4d6"),
      new EmptyScene("#13283d"),
    ).direction(direction).timing({ duration: 1.2 }).addTo(this);
  }

  override construct(): void {
    const timeline = new Timeline();
    this.turn.animate(timeline);
    this.play(timeline);
  }
}

test("page turn keeps both scenes fixed while the outgoing surface wraps away", () => {
  const scene = new TransitionScene().prepare();
  const { outgoing, incoming, fold } = scene.turn;

  assert.deepEqual(scene.turn.all(), [outgoing, incoming, fold]);
  assert.equal(scene.turn.duration, 1.2);
  assert.equal(outgoing.depthModeValue, "overlay");
  assert.equal(incoming.depthModeValue, "overlay");
  assert.equal(outgoing.renderLayer, 1);
  assert.equal(incoming.renderLayer, 0);
  assert.equal(fold.renderLayer, 2);
  assert.deepEqual(outgoing.worldSize, { width: scene.viewWidth, height: scene.viewHeight });

  assert.equal(incoming.initialState.x, 0);
  assert.equal(outgoing.initialState.x, 0);
  assert.equal(
    outgoing.initialStyle.clipPath,
    "polygon(0% 0%, 100% 0%, 100% 20%, 100% 50%, 100% 80%, 100% 100%, 0% 100%)",
  );

  const foldState = scene.sampleAt(0.6).get(scene.turn.fold);
  const outgoingState = scene.sampleAt(0.6).get(outgoing);
  assert.ok(foldState);
  assert.ok(outgoingState);
  assert.ok(Math.abs(foldState.x + scene.viewWidth * 0.01) < 1e-9);
  assert.ok(Math.abs(outgoingState.x) < 1e-9);
  assert.ok(Math.abs(foldState.scaleX - 1) < 1e-9);
  assert.match(
    String(scene.sampleStylesAt(0.6).get(outgoing)?.clipPath),
    /^polygon\(0% 0%, 52% 0%, 50% 20%, 49/,
  );

  const endState = scene.sampleAt(1.2);
  assert.ok(Math.abs(endState.get(incoming)!.x) < 1e-9);
  assert.ok(Math.abs(endState.get(outgoing)!.x) < 1e-9);
});

test("page turn supports the reverse direction and validates style values", () => {
  const scene = new TransitionScene("right").prepare();
  assert.equal(scene.turn.incoming.initialState.x, 0);
  const end = scene.sampleAt(1.2);
  assert.ok(Math.abs(end.get(scene.turn.incoming)!.x) < 1e-9);
  assert.ok(Math.abs(end.get(scene.turn.outgoing)!.x) < 1e-9);

  assert.throws(
    () => PageTurn(new EmptyScene("#fff"), new EmptyScene("#000")).style({ curlWidth: 0 }).duration(),
    /Page turn curl width must be positive/,
  );
  assert.throws(
    () => PageTurn(new EmptyScene("#fff"), new EmptyScene("#000")).style({ shadowOpacity: 2 }).duration(),
    /between 0 and 1/,
  );
});
