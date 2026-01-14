import axios from 'axios';
import type {
  InfoRequest,
  DownloadRequest,
  DownloadResponse,
  VideoInfo,
  PlaylistInfo,
  MediaInfo,
} from '../types';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Health check endpoint
 */
export async function checkHealth(): Promise<{ status: string; message: string }> {
  const response = await api.get('/api/health');
  return response.data;
}

/**
 * Get information about a YouTube video
 */
export async function getVideoInfo(request: InfoRequest): Promise<VideoInfo> {
  const response = await api.post('/api/videos/info', request);
  return response.data;
}

/**
 * Get information about a YouTube playlist
 */
export async function getPlaylistInfo(request: InfoRequest): Promise<PlaylistInfo> {
  const response = await api.post('/api/playlists/info', request);
  return response.data;
}

/**
 * Get information about a URL (auto-detect video or playlist)
 */
export async function getMediaInfo(url: string): Promise<MediaInfo> {
  // Try video first, then playlist
  // In Phase 2, this will be a smarter detection
  try {
    if (url.includes('list=')) {
      return await getPlaylistInfo({ url });
    }
    return await getVideoInfo({ url });
  } catch {
    // If video fails and URL might be a playlist, try playlist
    if (!url.includes('list=')) {
      return await getPlaylistInfo({ url });
    }
    throw new Error('Unable to fetch media information');
  }
}

/**
 * Start downloading audio from a video
 */
export async function downloadVideo(request: DownloadRequest): Promise<DownloadResponse> {
  const response = await api.post('/api/videos/download', request);
  return response.data;
}

/**
 * Start downloading audio from a playlist
 */
export async function downloadPlaylist(request: DownloadRequest): Promise<DownloadResponse> {
  const response = await api.post('/api/playlists/download', request);
  return response.data;
}

/**
 * Create an EventSource for download progress updates
 */
export function createProgressStream(sessionId: string): EventSource {
  return new EventSource(`http://localhost:8000/api/progress/${sessionId}`);
}

export default api;
