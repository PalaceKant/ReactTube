import {useNavigation} from "@react-navigation/native";
import React from "react";
import {Platform, StyleSheet, TVFocusGuideView, View} from "react-native";

import {VideoMetadata} from "./VideoPlayer";

import {MetadataButton} from "@/components/video/videoPlayer/metadata/MetadataButton";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {useTVOverscanInsets} from "@/ui/tv";

interface MetadataContainerProps {
  metadata: VideoMetadata;
  section?: "title" | "actions";
  paused?: boolean;
  onTogglePlay?: () => void;
  resolution?: string;
  pause: () => void;
  onJumpToStart: () => void;
  /** Reports that focus reached the controls above the bottom panel. */
  onControlFocus?: () => void;
}

const metadataSeparator = " · ";

const MetadataContainer = React.memo(function MetadataContainer({
  metadata,
  section,
  paused,
  onTogglePlay,
  resolution,
  pause,
  onJumpToStart,
  onControlFocus,
}: MetadataContainerProps) {
  const navigation = useNavigation<RootNavProp>();
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const overscan = useTVOverscanInsets();
  const {subtitles, selectedSubtitle} = useVideoPlayerSettings();

  const subtitle = [
    metadata.author,
    metadata.views,
    metadata.videoDate,
    resolution,
  ]
    .filter(Boolean)
    .join(metadataSeparator);

  if (Platform.isTV && section) {
    if (section === "title")
      return (
        <View pointerEvents={"none"} style={{gap: 12, maxWidth: "88%"}}>
          <AppText
            variant={"titleLarge"}
            numberOfLines={2}
            style={{textShadowColor: "#000", textShadowRadius: 6}}>
            {metadata.title}
          </AppText>
          <AppText variant={"bodySmall"} color={"textSecondary"}>
            {subtitle}
          </AppText>
        </View>
      );
    const action = (
      icon: string,
      key: Parameters<typeof t>[0],
      onPress?: () => void,
    ) => (
      <MetadataButton
        compact
        icon={icon}
        label={t(key)}
        accessibilityLabel={t(key)}
        onPress={onPress}
        onFocus={onControlFocus}
      />
    );
    return (
      <TVFocusGuideView
        autoFocus
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 52,
        }}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <MetadataButton
            compact
            imageUrl={metadata.authorThumbnailUrl}
            accessibilityLabel={t("video.player.channel")}
            onPress={() => {
              pause();
              metadata.onAuthorPress();
            }}
            onFocus={onControlFocus}
          />
          {action(
            "info-outline",
            "video.description.title",
            metadata.onShowDetails,
          )}
        </View>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          {action("skip-previous", "video.player.jumpToStart", onJumpToStart)}
          {action(
            paused ? "play-arrow" : "pause",
            paused ? "video.player.play" : "video.player.pause",
            onTogglePlay,
          )}
        </View>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          {action(
            "chat-bubble-outline",
            "video.comments.title",
            metadata.onShowComments,
          )}
          {action("bookmark-border", "video.action.save", metadata.onSaveVideo)}
          {action("refresh", "video.player.reload", metadata.onRefresh)}
          {subtitles
            ? action(
                selectedSubtitle ? "closed-caption" : "closed-caption-off",
                "video.player.subtitles",
                () => navigation.navigate("VideoPlayerSubtitles"),
              )
            : null}
          {action("settings", "video.player.settings", () =>
            navigation.navigate("VideoPlayerSettings"),
          )}
          {action(
            "info",
            "video.playbackInfo.title",
            metadata.onShowPlaybackInfo,
          )}
        </View>
      </TVFocusGuideView>
    );
  }

  return (
    <TVFocusGuideView autoFocus>
      {/* The overlay is drawn edge to edge, so the row keeps the title-safe
       * margin itself. A percentage width only happened to approximate it at
       * one resolution. */}
      <View
        style={[
          styles.container,
          {
            gap: theme.spacing.lg,
            paddingTop: overscan.top,
            paddingStart: overscan.left,
            paddingEnd: overscan.right,
          },
        ]}>
        <View
          style={[
            styles.titleMetadata,
            {
              gap: theme.spacing.xs,
              padding: theme.spacing.md,
              borderRadius: theme.radii.panel,
              backgroundColor: theme.colors.scrim,
            },
          ]}>
          <AppText numberOfLines={2} variant={"titleLarge"}>
            {metadata.title}
          </AppText>
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {subtitle}
          </AppText>
        </View>
        <View style={styles.spacer} />
        <View style={styles.buttonMetadata}>
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.channel")}
            imageUrl={metadata.authorThumbnailUrl}
            // TODO: Outsource pause event in VideoScreen?
            onPress={() => {
              pause();
              metadata.onAuthorPress();
            }}
          />
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.action.save")}
            icon={"playlist-add"}
            onPress={metadata.onSaveVideo}
          />
          {!Platform.isTV ? (
            <>
              <MetadataButton
                onFocus={onControlFocus}
                accessibilityLabel={t("video.action.like")}
                active={metadata.liked}
                icon={"thumb-up"}
                onPress={metadata.onLike}
              />
              <MetadataButton
                onFocus={onControlFocus}
                accessibilityLabel={t("video.action.dislike")}
                active={metadata.disliked}
                icon={"thumb-down"}
                onPress={metadata.onDislike}
              />
            </>
          ) : null}
          {metadata.onShowComments ? (
            <MetadataButton
              onFocus={onControlFocus}
              accessibilityLabel={t("video.comments.title")}
              label={t("video.comments.title")}
              icon={"chat-bubble-outline"}
              onPress={metadata.onShowComments}
            />
          ) : null}
          {metadata.onShowDetails ? (
            <MetadataButton
              onFocus={onControlFocus}
              accessibilityLabel={t("video.player.details")}
              icon={"info-outline"}
              onPress={metadata.onShowDetails}
            />
          ) : null}
          {metadata.onShowPlaybackInfo ? (
            <MetadataButton
              onFocus={onControlFocus}
              accessibilityLabel={t("video.playbackInfo.title")}
              label={t("video.playbackInfo.title")}
              icon={"high-quality"}
              onPress={metadata.onShowPlaybackInfo}
            />
          ) : null}
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.jumpToStart")}
            icon={"skip-previous"}
            onPress={onJumpToStart}
          />
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.reload")}
            icon={"refresh"}
            onPress={metadata.onRefresh}
          />
          {subtitles ? (
            <MetadataButton
              onFocus={onControlFocus}
              accessibilityLabel={t("video.player.subtitles")}
              active={selectedSubtitle !== undefined}
              icon={selectedSubtitle ? "closed-caption" : "closed-caption-off"}
              onPress={() => navigation.navigate("VideoPlayerSubtitles")}
            />
          ) : null}
          <MetadataButton
            onFocus={onControlFocus}
            accessibilityLabel={t("video.player.settings")}
            icon={"settings"}
            onPress={() => navigation.navigate("VideoPlayerSettings")}
          />
        </View>
      </View>
    </TVFocusGuideView>
  );
});

export default MetadataContainer;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
    flexDirection: Platform.isTV ? "column" : "row",
  },
  titleMetadata: {
    maxWidth: Platform.isTV ? "80%" : "40%",
  },
  spacer: {
    flex: Platform.isTV ? 0 : 1,
  },
  buttonMetadata: {
    alignSelf: Platform.isTV ? "flex-start" : "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
