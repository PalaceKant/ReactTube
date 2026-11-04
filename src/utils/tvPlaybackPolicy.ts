/** Reading the transparent detail/comment panel must preserve play/pause state. */
export function shouldPauseTVVideoOnBlur(nextRoute?: string): boolean {
  return nextRoute !== "VideoPlayerInfo";
}
