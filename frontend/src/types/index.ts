export interface VideoInfo {
  type: "video";
  id: string;
  title: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  channel: string;
}

export interface PlaylistVideo {
  id: string;
  title: string;
  duration: number;
  durationFormatted: string;
  selected: boolean;
}

export interface PlaylistInfo {
  type: "playlist";
  id: string;
  title: string;
  videoCount: number;
  thumbnail: string;
  videos: PlaylistVideo[];
}

export interface CompletedFile {
  title: string;
  filename?: string;
  error?: string;
}

export interface DownloadProgress {
  status: "starting" | "downloading" | "processing" | "complete" | "error";
  percent: number;
  speed?: string;
  eta?: string;
  currentVideo?: number;
  totalVideos?: number;
  currentTitle?: string;
  filename?: string;
  files?: CompletedFile[];
  error?: string;
}

export type Bitrate = "128" | "192" | "256" | "320";

export interface InfoRequest {
  url: string;
}

export interface DownloadRequest {
  url: string;
  bitrate: Bitrate;
  videoIds?: string[];
}

export interface DownloadResponse {
  sessionId: string;
  isPlaylist: boolean;
}

export type MediaInfo = VideoInfo | PlaylistInfo;
