/** Metadata of the exact selected stream, not the video's advertised maximum. */
export interface PlaybackFormat {
  mimeType?: string;
  fps?: number;
  bitrate?: number;
}

export function describePlaybackFormat(mimeType?: string): {
  container?: string;
  codec?: string;
} {
  if (!mimeType) return {};
  const container = mimeType.split(";")[0].trim();
  const codec = /codecs\s*=\s*["']([^"']+)["']/i.exec(mimeType)?.[1];
  return {container: container || undefined, codec};
}
