import assert from "node:assert/strict";
import test from "node:test";

import {
  clampSeekTime,
  createSeekCommitter,
  createRemoteSeekInterpreter,
  getScrubStepSeconds,
  getSeekerPositionForTime,
} from "../src/components/video/videoPlayer/tvRemoteSeek.ts";

const DOWN = 0;
const UP = 1;

test("rapid taps commit only the latest target while a hold commits immediately", t => {
  t.mock.timers.enable({apis: ["setTimeout"]});
  const requests = [];
  const committer = createSeekCommitter(time => requests.push(time));
  committer.request(15, true);
  t.mock.timers.tick(100);
  committer.request(30, true);
  t.mock.timers.tick(100);
  assert.deepEqual(requests, []);
  t.mock.timers.tick(50);
  assert.deepEqual(requests, [30]);
  committer.request(45, true);
  committer.request(150, false);
  assert.deepEqual(requests, [30, 150]);
  t.mock.timers.tick(1000);
  assert.deepEqual(requests, [30, 150]);
});

test("leaving a video cancels the pending decoder seek", t => {
  t.mock.timers.enable({apis: ["setTimeout"]});
  const requests = [];
  const committer = createSeekCommitter(time => requests.push(time));
  committer.request(30, true);
  committer.cancel();
  t.mock.timers.tick(1000);
  assert.deepEqual(requests, []);
});

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
    time = clampSeekTime(time + getScrubStepSeconds(tick * 250), 150);
  }
  assert.equal(time, 130);
  for (let tick = 0; tick < 10; tick++) {
    time = clampSeekTime(time + getScrubStepSeconds(1000 + tick * 250), 150);
  }
  assert.equal(time, 149);
  for (let tick = 0; tick < 20; tick++) {
    time = clampSeekTime(time - getScrubStepSeconds(4000 + tick * 250), 150);
  }
  assert.equal(time, 0);
});

test("holding longer accelerates time seeking with a bounded maximum", () => {
  assert.equal(getScrubStepSeconds(0), 10);
  assert.equal(getScrubStepSeconds(799), 10);
  assert.equal(getScrubStepSeconds(800), 20);
  assert.equal(getScrubStepSeconds(1999), 20);
  assert.equal(getScrubStepSeconds(2000), 40);
  assert.equal(getScrubStepSeconds(3999), 40);
  assert.equal(getScrubStepSeconds(4000), 60);
  assert.equal(getScrubStepSeconds(600000), 60);
});

test("repeated tvOS long-press events do not restart acceleration", () => {
  const remote = createRemoteSeekInterpreter("ios");
  assert.deepEqual(
    feed(remote, [
      ["longRight", DOWN],
      ["longRight", DOWN],
      ["longRight", undefined],
      ["longRight", UP],
    ]),
    [{type: "scrubStart", direction: 1, source: "dpad"}, {type: "scrubEnd"}],
  );
  assert.deepEqual(feed(remote, [["longLeft", DOWN]]), [
    {type: "scrubStart", direction: -1, source: "dpad"},
  ]);
});

test("maps a time onto the seek bar and keeps it on the bar", () => {
  assert.equal(getSeekerPositionForTime(30, 120, 400), 100);
  assert.equal(getSeekerPositionForTime(500, 120, 400), 400);
  assert.equal(getSeekerPositionForTime(-1, 120, 400), 0);
  assert.equal(getSeekerPositionForTime(30, 0, 400), 0);
});
