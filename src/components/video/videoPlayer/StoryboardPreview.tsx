import {Image} from "expo-image";
import React, {useMemo, useState} from "react";
import {StyleSheet, View} from "react-native";

import {getStoryboardFrame, type YTStoryboard} from "@/extraction/storyboard";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";

export const SEEK_PREVIEW_WIDTH = 320;
const FRAME_WIDTH = SEEK_PREVIEW_WIDTH - 6;

interface Props {
  storyboard?: YTStoryboard;
  seconds: number;
  duration: number;
}

/** Crop a cached sprite sheet instead of downloading an image for every tick. */
export const StoryboardPreview = React.memo(function StoryboardPreview({
  storyboard,
  seconds,
  duration,
}: Props) {
  const {t} = useTranslation();
  const frame = storyboard
    ? getStoryboardFrame(storyboard, seconds, duration)
    : undefined;
  const [loadedUrl, setLoadedUrl] = useState<string>();
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = frame?.url;
  const source = useMemo(() => (url ? {uri: url} : undefined), [url]);
  const height = storyboard
    ? (FRAME_WIDTH * storyboard.thumbnailHeight) / storyboard.thumbnailWidth
    : 180;
  const time = Math.max(0, Math.floor(seconds));
  const timestamp =
    time >= 3600
      ? `${Math.floor(time / 3600)}:${String(Math.floor(time / 60) % 60).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`
      : `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`;

  return (
    <View pointerEvents={"none"} style={styles.container}>
      <View style={[styles.crop, {height}]}>
        <AppText variant={"bodySmall"} style={styles.hint}>
          {t(
            !frame || failedUrl === frame.url
              ? "video.seek.previewUnavailable"
              : "video.seek.previewLoading",
          )}
        </AppText>
        {frame && storyboard && failedUrl !== frame.url ? (
          <Image
            source={source}
            cachePolicy={"memory-disk"}
            recyclingKey={frame.url}
            transition={0}
            contentFit={"fill"}
            onLoad={() => setLoadedUrl(frame.url)}
            onError={() => setFailedUrl(frame.url)}
            style={{
              position: "absolute",
              width: FRAME_WIDTH * storyboard.columns,
              height: height * storyboard.rows,
              left: -frame.column * FRAME_WIDTH,
              top: -frame.row * height,
              opacity: loadedUrl === frame.url ? 1 : 0,
            }}
          />
        ) : null}
      </View>
      <AppText variant={"bodySmall"} style={styles.time}>
        {timestamp}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SEEK_PREVIEW_WIDTH,
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "white",
    overflow: "hidden",
  },
  crop: {
    width: FRAME_WIDTH,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {padding: 16, textAlign: "center"},
  time: {paddingVertical: 8, textAlign: "center"},
});
