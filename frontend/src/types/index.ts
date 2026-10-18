export interface VideoFormat {
  formatId: string;
  resolution: string;
  fps: number;
  filesize: number | null;
  vcodec: string;
  ext: string;
}

export interface AudioFormat {
  formatId: string;
  bitrate: number;  // Will be a float from backend but TypeScript number handles both
  filesize: number | null;
  acodec: string;
  ext: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  duration: number;
  thumbnail: string;
  channel?: string;
  uploadDate?: string;
  description?: string;
  viewCount?: number;
  availableVideoFormats: VideoFormat[];
  availableAudioFormats: AudioFormat[];
}

export interface DownloadTask {
  taskId: string;
  url: string;
  formatType: 'video' | 'audio';
  formatId: string;
  status: 'pending' | 'downloading' | 'processing' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  error: string | null;
  title: string;
  outputPath?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
}

export interface PlaylistInfo {
  playlistId: string;
  title: string;
  videoCount: number;
  videos: VideoInfo[];
}

export interface DownloadRequest {
  url: string;
  formatType: 'video' | 'audio';
  formatId: string;
  outputFilename?: string;
}

export type PlaylistQuality = 'best' | '2160p' | '1080p' | '720p' | '480p' | 'audio';

export interface PlaylistDownloadRequest {
  playlistUrl: string;
  quality: PlaylistQuality;
}

export interface BatchDownloadResponse {
  batchId: string;
  taskIds: string[];
  totalVideos: number;
}

export interface QueueStats {
  pending: number;
  active: number;
  totalTasks: number;
}
export interface AppSettings {
  forceIpv6: boolean;
}
