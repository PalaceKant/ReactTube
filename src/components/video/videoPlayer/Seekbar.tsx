import {Dispatch, Ref, SetStateAction, useState, type ReactNode} from "react";
import {PanResponderInstance, Pressable, StyleSheet, View} from "react-native";

import {useAppTheme} from "@/ui/theme";

interface SeekbarProps {
  preview?: ReactNode;
  previewWidth?: number;
  seekerFillWidth: number;
  seekerPosition: number;
  seekColor: string;
  seekerPanHandlers: PanResponderInstance;
  setSeekerWidth: Dispatch<SetStateAction<number>>;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Select on the focused handle; the TV overlay toggles playback with it. */
  onPress?: () => void;
  /** The focusable handle, so the overlay can move focus back onto it. */
  handleRef?: Ref<View>;
}

const handleSize = 32;

/**
 * Playback progress. The fill is the media progress colour every surface uses
 * for watch progress, so the bar in the player and the bar on a card mean the
 * same thing.
 */
export default function Seekbar({
  preview,
  previewWidth = 320,
  seekColor,
  seekerFillWidth,
  seekerPosition,
  seekerPanHandlers,
  setSeekerWidth,
  onFocus,
  onBlur,
  onPress,
  handleRef,
}: SeekbarProps) {
  const {theme, reduceMotion} = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const fillColor = seekColor || theme.colors.mediaProgress;

  return (
    <View
      collapsable={false}
      style={[styles.container, {marginHorizontal: theme.spacing.xl}]}
      {...seekerPanHandlers}>
      {preview ? (
        <View
          pointerEvents={"none"}
          style={{
            position: "absolute",
            bottom: 44,
            left: Math.max(
              0,
              Math.min(
                seekerPosition - previewWidth / 2,
                trackWidth - previewWidth,
              ),
            ),
            width: previewWidth,
          }}>
          {preview}
        </View>
      ) : null}
      <View
        onLayout={event => {
          const width = event.nativeEvent.layout.width;
          setSeekerWidth(width);
          setTrackWidth(width);
        }}
        pointerEvents={"none"}
        style={[styles.track, {backgroundColor: theme.colors.divider}]}>
        <View
          pointerEvents={"none"}
          style={[
            styles.fill,
            {width: seekerFillWidth, backgroundColor: fillColor},
          ]}
        />
      </View>
      <View
        pointerEvents={"box-none"}
        style={[styles.handle, {left: seekerPosition}]}>
        <Pressable
          hasTVPreferredFocus
          ref={handleRef}
          onPress={onPress}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}>
          <View
            pointerEvents={"none"}
            style={[
              styles.circle,
              {
                backgroundColor: fillColor,
                borderColor: focused
                  ? theme.colors.focus
                  : theme.colors.focusResting,
              },
              focused && !reduceMotion && styles.circleFocused,
            ]}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    height: 28,
  },
  track: {
    height: 5,
    position: "relative",
    top: 14,
    width: "100%",
  },
  fill: {
    height: 5,
    width: "100%",
  },
  handle: {
    position: "absolute",
    marginLeft: -7,
    height: handleSize,
    width: handleSize,
  },
  circle: {
    borderRadius: 12,
    borderWidth: 3,
    position: "relative",
    top: 6,
    left: -5,
    height: 20,
    width: 20,
  },
  circleFocused: {
    transform: [{scale: 1.3}],
  },
});
