import axios from 'axios';
import {
  VideoInfo,
  PlaylistInfo,
  DownloadRequest,
  DownloadTask,
  PlaylistDownloadRequest,
  BatchDownloadResponse,
  QueueStats
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 60000, // Increased to 60 seconds for video info extraction
});

// Add request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error;
  }
);

export const youtubeApi = {
  getVideoInfo: async (url: string): Promise<VideoInfo> => {
    const response = await api.post('/video/info', { url });
    return response.data;
  },

  getPlaylistInfo: async (url: string): Promise<PlaylistInfo> => {
    const response = await api.post('/playlist/info', { url });
    return response.data;
  },

  startDownload: async (request: DownloadRequest): Promise<DownloadTask> => {
    const response = await api.post('/download/start', request);
    return response.data;
  },

  getDownloadStatus: async (taskId: string): Promise<DownloadTask> => {
    const response = await api.get(`/download/status/${taskId}`);
    return response.data;
  },

  downloadFile: (taskId: string): string => {
    return `${api.defaults.baseURL}/download/file/${taskId}`;
  },

  startPlaylistDownload: async (
    request: PlaylistDownloadRequest
  ): Promise<BatchDownloadResponse> => {
    const response = await api.post('/playlist/download', request);
    return response.data;
  },

  cancelDownload: async (taskId: string): Promise<{ cancelled: boolean }> => {
    const response = await api.delete(`/download/${taskId}`);
    return response.data;
  },

  removeDownload: async (taskId: string): Promise<{ removed: boolean }> => {
    const response = await api.delete(`/download/${taskId}/remove`);
    return response.data;
  },

  cancelAll: async (): Promise<{ cancelled: number }> => {
    const response = await api.post('/queue/cancel-all');
    return response.data;
  },

  getQueueState: async (): Promise<{ paused: boolean }> => {
    const response = await api.get('/queue/state');
    return response.data;
  },

  setQueuePaused: async (paused: boolean): Promise<{ paused: boolean }> => {
    const response = await api.post(paused ? '/queue/pause' : '/queue/resume');
    return response.data;
  },

  getQueueStatus: async (): Promise<DownloadTask[]> => {
    const response = await api.get('/queue/status');
    return response.data;
  },

  getQueueStats: async (): Promise<QueueStats> => {
    const response = await api.get('/queue/stats');
    return response.data;
  },
};

export default api;