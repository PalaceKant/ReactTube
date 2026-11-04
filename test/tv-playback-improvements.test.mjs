import assert from "node:assert/strict";
import test from "node:test";

import {describePlaybackFormat} from "../src/utils/PlaybackFormat.ts";
import {buildPlaybackLadder} from "../src/utils/PlaybackLadder.ts";
import {shouldPauseTVVideoOnBlur} from "../src/utils/tvPlaybackPolicy.ts";

test("reading comments preserves playback; leaving for another screen pauses", () => {
  assert.equal(shouldPauseTVVideoOnBlur("VideoPlayerInfo"), false);
  for (const route of [
    "Home",
    "ChannelScreen",
    "VideoScreen",
    "SettingsScreen",
    undefined,
  ]) {
    assert.equal(shouldPauseTVVideoOnBlur(route), true);
  }
});

test("active VLC format is retained without leaking into HLS fallback", () => {
  const format = {
    mimeType: "video/webm; codecs='vp9'",
    fps: 60,
    bitrate: 12000000,
  };
  const ladder = buildPlaybackLadder(
    {
      vlc: {videoUrl: "https://example.com/v", format},
      youtubeHlsUrl: "https://example.com/fallback.m3u8",
    },
    "generated",
    "vlc",
  );
  assert.deepEqual(ladder[0].format, format);
  assert.equal(ladder[1].format, undefined);
  assert.deepEqual(describePlaybackFormat(ladder[0].format.mimeType), {
    container: "video/webm",
    codec: "vp9",
  });
  assert.deepEqual(describePlaybackFormat(undefined), {});
  assert.deepEqual(describePlaybackFormat("video/mp4"), {
    container: "video/mp4",
    codec: undefined,
  });
});
