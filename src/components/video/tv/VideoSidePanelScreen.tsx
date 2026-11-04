import type {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect, useState} from "react";
import {StyleSheet, View} from "react-native";

import {VideoSidePanel, type VideoSidePanelTab} from "./VideoSidePanel";

import {useVideoSidePanel} from "@/context/VideoSidePanelContext";
import useVideoComments from "@/hooks/comments/useVideoComments";
import type {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "VideoPlayerInfo">;

/** Native-stack modal that isolates the detail panel from the player controls. */
export function VideoSidePanelScreen({navigation}: Props) {
  const {data, clear} = useVideoSidePanel();
  const [tab, setTab] = useState<VideoSidePanelTab>(
    data?.initialTab ?? "details",
  );
  // Keep the loaded page when switching tabs within this panel session.
  const [commentsRequested, setCommentsRequested] = useState(
    data?.initialTab === "comments",
  );
  const comments = useVideoComments(
    data?.videoId ?? "",
    Boolean(data) && commentsRequested,
  );

  useEffect(() => {
    if (!data) {
      navigation.goBack();
    }
  }, [data, navigation]);

  useEffect(() => clear, [clear]);

  if (!data) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <VideoSidePanel
        comments={comments}
        model={data.model}
        onClose={() => navigation.goBack()}
        onTabChange={nextTab => {
          if (nextTab === "comments") setCommentsRequested(true);
          setTab(nextTab);
        }}
        queueEntries={data.queueEntries}
        tab={tab}
        visible
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
