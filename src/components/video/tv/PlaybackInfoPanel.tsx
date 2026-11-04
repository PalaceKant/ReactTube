import React from "react";
import {Modal, StyleSheet, View} from "react-native";

import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {describePlaybackFormat} from "@/utils/PlaybackFormat";
import type {PlaybackStep} from "@/utils/PlaybackLadder";
import {formatResolutionLabel, type PlaybackSize} from "@/utils/PlaybackSize";

interface Props {
  visible: boolean;
  size?: PlaybackSize;
  source?: PlaybackStep;
  engine?: string;
  speed?: number;
  onClose: () => void;
}

/** Only reports the active source and measured size; unknown codecs stay unknown. */
export const PlaybackInfoPanel = React.memo(function PlaybackInfoPanel({
  visible,
  size,
  source,
  engine,
  speed,
  onClose,
}: Props) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  if (!visible) return null;
  const unknown = t("video.playbackInfo.unknown");
  const format = describePlaybackFormat(source?.format?.mimeType);
  const hls = source?.kind.endsWith("hls");
  const transport = hls
    ? "HLS"
    : source?.kind === "vlc"
      ? "HTTPS / DASH"
      : source?.kind === "progressive"
        ? "HTTPS / Progressive"
        : unknown;
  const rows = [
    [
      t("video.playbackInfo.resolution"),
      size
        ? `${formatResolutionLabel(size)} · ${size.width} × ${size.height}`
        : unknown,
    ],
    [t("video.playbackInfo.player"), engine ?? unknown],
    [t("video.playbackInfo.delivery"), transport],
    [
      t("video.playbackInfo.format"),
      format.container ?? (hls ? "application/vnd.apple.mpegurl" : unknown),
    ],
    [t("video.playbackInfo.codec"), format.codec ?? unknown],
    [
      t("video.playbackInfo.fps"),
      source?.format?.fps ? `${source.format.fps} fps` : unknown,
    ],
    [
      t("video.playbackInfo.bitrate"),
      source?.format?.bitrate
        ? `${(source.format.bitrate / 1_000_000).toFixed(2)} Mbps`
        : unknown,
    ],
    [t("video.playbackInfo.speed"), `${speed ?? 1}×`],
  ];
  return (
    <Modal
      transparent
      visible
      onRequestClose={onClose}
      animationType={"fade"}
      supportedOrientations={["landscape"]}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
            },
          ]}>
          <AppText variant={"titleLarge"}>
            {t("video.playbackInfo.title")}
          </AppText>
          {rows.map(([label, value]) => (
            <View style={styles.row} key={label}>
              <AppText
                color={"textSecondary"}
                variant={"bodySmall"}
                style={styles.label}>
                {label}
              </AppText>
              <AppText variant={"bodySmall"} style={styles.value}>
                {value}
              </AppText>
            </View>
          ))}
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {t("video.playbackInfo.hint")}
          </AppText>
          <AppButton
            label={t("video.panel.close")}
            onPress={onClose}
            hasTVPreferredFocus
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  panel: {
    width: 960,
    maxWidth: "90%",
    padding: 32,
    gap: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  row: {flexDirection: "row", gap: 24},
  label: {width: 280},
  value: {flex: 1},
});
