import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {Platform} from "react-native";

import {
  clampSeekTime,
  createRemoteSeekInterpreter,
  SeekDirection,
  SeekSource,
  TV_SCRUB_TICK_MS,
  getScrubStepSeconds,
  TV_SEEK_CHAIN_WINDOW_MS,
  TV_SEEK_STEP_SECONDS,
  createSeekCommitter,
} from "../tvRemoteSeek";

import {useTVRemoteEvent} from "@/ui/tv";

interface TVSeekControlProps {
  sourceKey?: string;
  /** The seek bar has focus, so the arrow keys seek. */
  seekerFocused: boolean;
  /** The player owns the remote; false while a screen or modal covers it. */
  active: boolean;
  duration: number;
  currentTime: number;
  seek: (seconds: number) => void;
  setPause: Dispatch<SetStateAction<boolean>>;
}

interface Scrub {
  time: number;
  timer: ReturnType<typeof setInterval>;
}

/**
 * Remote seeking for the TV overlay.
 *
 * A tap jumps by a fixed step, a held key scrubs a preview position that is
 * only committed to the player on release. The preview is returned as
 * `scrubTime` so the seek bar and timer can show where the release will land.
 */
export default function useTVSeekControl({
  sourceKey,
  seekerFocused,
  active,
  duration,
  currentTime,
  seek,
  setPause,
}: TVSeekControlProps) {
  const [scrubTime, setScrubTime] = useState<number>();
  const [stepPreviewTime, setStepPreviewTime] = useState<number>();
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [interpreter] = useState(() =>
    createRemoteSeekInterpreter(Platform.OS === "android" ? "android" : "ios"),
  );

  const scrubRef = useRef<Scrub>(undefined);
  const lastTargetRef = useRef<{time: number; at: number}>(undefined);

  // The scrub timer outlives the render that started it.
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const seekRef = useRef(seek);
  seekRef.current = seek;
  const [committer] = useState(() =>
    createSeekCommitter(seconds => seekRef.current(seconds)),
  );

  /** Where the next seek starts: a just-requested target, else the player. */
  const getSeekBase = useCallback(() => {
    const lastTarget = lastTargetRef.current;
    if (lastTarget && Date.now() - lastTarget.at < TV_SEEK_CHAIN_WINDOW_MS) {
      return lastTarget.time;
    }
    return currentTimeRef.current;
  }, []);

  const seekTo = useCallback(
    (seconds: number, defer = false) => {
      const target = clampSeekTime(seconds, durationRef.current);
      lastTargetRef.current = {time: target, at: Date.now()};
      committer.request(target, defer);
      clearTimeout(previewTimer.current);
      setStepPreviewTime(target);
      previewTimer.current = setTimeout(
        () => setStepPreviewTime(undefined),
        1000,
      );
    },
    [committer],
  );

  const stopScrub = useCallback(
    (commit: boolean) => {
      const scrub = scrubRef.current;
      if (!scrub) {
        return;
      }
      clearInterval(scrub.timer);
      scrubRef.current = undefined;
      if (commit) {
        seekTo(scrub.time);
      }
      setScrubTime(undefined);
    },
    [seekTo],
  );

  const startScrub = useCallback(
    (direction: SeekDirection) => {
      stopScrub(false);
      committer.cancel();
      clearTimeout(previewTimer.current);
      setStepPreviewTime(undefined);
      const startedAt = Date.now();
      const scrub: Scrub = {
        time: clampSeekTime(
          getSeekBase() + direction * getScrubStepSeconds(0),
          durationRef.current,
        ),
        timer: setInterval(() => {
          scrub.time = clampSeekTime(
            scrub.time +
              direction * getScrubStepSeconds(Date.now() - startedAt),
            durationRef.current,
          );
          setScrubTime(scrub.time);
        }, TV_SCRUB_TICK_MS),
      };
      scrubRef.current = scrub;
      setScrubTime(scrub.time);
    },
    [getSeekBase, stopScrub, committer],
  );

  // Losing the seek bar or the remote mid-scrub lands where the preview was,
  // instead of leaving a timer running that nothing would stop.
  const canSeekWithDpad = seekerFocused && active;
  useEffect(() => {
    if (!canSeekWithDpad) {
      interpreter.reset();
      stopScrub(true);
    }
  }, [canSeekWithDpad, interpreter, stopScrub]);

  useEffect(() => {
    if (!active) committer.cancel();
  }, [active, committer]);

  useEffect(() => {
    interpreter.reset();
    stopScrub(false);
    lastTargetRef.current = undefined;
    committer.cancel();
    clearTimeout(previewTimer.current);
    setStepPreviewTime(undefined);
  }, [sourceKey, interpreter, stopScrub, committer]);

  useEffect(
    () => () => {
      clearTimeout(previewTimer.current);
      committer.cancel();
      if (scrubRef.current) clearInterval(scrubRef.current.timer);
    },
    [committer],
  );

  const allowed = (source: SeekSource) =>
    source === "media" ? active : canSeekWithDpad;

  useTVRemoteEvent(event => {
    for (const intent of interpreter.interpret(event)) {
      switch (intent.type) {
        case "step":
          if (allowed(intent.source)) {
            seekTo(
              getSeekBase() + intent.direction * TV_SEEK_STEP_SECONDS,
              true,
            );
          }
          break;
        case "scrubStart":
          if (allowed(intent.source)) {
            startScrub(intent.direction);
          }
          break;
        case "scrubEnd":
          stopScrub(true);
          break;
        case "togglePlay":
          active && setPause(paused => !paused);
          break;
        case "play":
          active && setPause(false);
          break;
        case "pause":
          active && setPause(true);
          break;
      }
    }
  }, active);

  return {
    scrubTime,
    previewTime: scrubTime ?? stepPreviewTime,
    scrubbing: scrubTime !== undefined,
  };
}
