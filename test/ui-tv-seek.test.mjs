import assert from "node:assert/strict";
import test from "node:test";

import {
  clampSeekTime,
  createRemoteSeekInterpreter,
  TV_SCRUB_STEP_SECONDS,
  getSeekerPositionForTime,
} from "../src/components/video/videoPlayer/tvRemoteSeek.ts";

const DOWN = 0;
const UP = 1;

function feed(interpreter, events) {
  return events.flatMap(([eventType, eventKeyAction]) =>
    interpreter.interpret({eventType, eventKeyAction}),
  );
}

test("android counts a play/pause press once, not on down and up", () => {
  const remote = createRemoteSeekInterpreter("android");

  assert.deepEqual(
    feed(remote, [
      ["playPause", DOWN],
      ["playPause", UP],
    ]),
    [{type: "togglePlay"}],
  );
});

test("android turns a released arrow into one step", () => {
  const remote = createRemoteSeekInterpreter("android");

  assert.deepEqual(
    feed(remote, [
      ["right", DOWN],
      ["right", UP],
    ]),
    [{type: "step", direction: 1, source: "dpad"}],
  );
});

test("android scrubs while an arrow repeats and stops on release", () => {
  const remote = createRemoteSeekInterpreter("android");

  assert.deepEqual(
    feed(remote, [
      ["left", DOWN],
      ["left", DOWN],
      ["left", DOWN],
      ["left", UP],
    ]),
    [{type: "scrubStart", direction: -1, source: "dpad"}, {type: "scrubEnd"}],
  );
});

test("android ends a scrub when another key interrupts it", () => {
  const remote = createRemoteSeekInterpreter("android");

  assert.deepEqual(
    feed(remote, [
      ["right", DOWN],
      ["right", DOWN],
      ["left", DOWN],
    ]),
    [{type: "scrubStart", direction: 1, source: "dpad"}, {type: "scrubEnd"}],
  );
});

test("android treats media keys as seeks that do not need focus", () => {
  const remote = createRemoteSeekInterpreter("android");

  assert.deepEqual(
    feed(remote, [
      ["fastForward", DOWN],
      ["fastForward", UP],
    ]),
    [{type: "step", direction: 1, source: "media"}],
  );
});

test("tvOS turns a tap into one step and a long press into one scrub", () => {
  const remote = createRemoteSeekInterpreter("ios");

  assert.deepEqual(feed(remote, [["left", UP]]), [
    {type: "step", direction: -1, source: "dpad"},
  ]);
  assert.deepEqual(
    feed(remote, [
      ["longRight", DOWN],
      ["longRight", undefined],
      ["longRight", UP],
    ]),
    [{type: "scrubStart", direction: 1, source: "dpad"}, {type: "scrubEnd"}],
  );
});

test("tvOS ends a scrub whose release never arrived on the next key", () => {
  const remote = createRemoteSeekInterpreter("ios");

  assert.deepEqual(
    feed(remote, [
      ["longLeft", DOWN],
      ["playPause", UP],
    ]),
    [
      {type: "scrubStart", direction: -1, source: "dpad"},
      {type: "scrubEnd"},
      {type: "togglePlay"},
    ],
  );
});

test("reset forgets a held key", () => {
  const remote = createRemoteSeekInterpreter("android");

  feed(remote, [
    ["right", DOWN],
    ["right", DOWN],
  ]);
  remote.reset();

  assert.deepEqual(feed(remote, [["right", UP]]), []);
});

test("clamps seek targets into the playable range", () => {
  assert.equal(clampSeekTime(-5, 100), 0);
  assert.equal(clampSeekTime(Number.NaN, 100), 0);
  assert.equal(clampSeekTime(50, 100), 50);
  assert.equal(clampSeekTime(120, 100), 99);
  // Without a known duration the target is only kept non-negative.
  assert.equal(clampSeekTime(120, 0), 120);
});

test("held arrows move through timestamps and stop at either video boundary", () => {
  let time = 90;
  for (let tick = 0; tick < 4; tick++) {
    time = clampSeekTime(time + TV_SCRUB_STEP_SECONDS, 150);
  }
  assert.equal(time, 130);
  for (let tick = 0; tick < 10; tick++) {
    time = clampSeekTime(time + TV_SCRUB_STEP_SECONDS, 150);
  }
  assert.equal(time, 149);
  for (let tick = 0; tick < 20; tick++) {
    time = clampSeekTime(time - TV_SCRUB_STEP_SECONDS, 150);
  }
  assert.equal(time, 0);
});

test("maps a time onto the seek bar and keeps it on the bar", () => {
  assert.equal(getSeekerPositionForTime(30, 120, 400), 100);
  assert.equal(getSeekerPositionForTime(500, 120, 400), 400);
  assert.equal(getSeekerPositionForTime(-1, 120, 400), 0);
  assert.equal(getSeekerPositionForTime(30, 0, 400), 0);
});
