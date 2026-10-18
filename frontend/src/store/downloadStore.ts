import { create } from 'zustand';
import { VideoInfo, PlaylistInfo, DownloadTask } from '../types';

interface DownloadState {
  currentVideo: VideoInfo | null;
  currentPlaylist: PlaylistInfo | null;
  downloadQueue: DownloadTask[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentVideo: (video: VideoInfo | null) => void;
  setCurrentPlaylist: (playlist: PlaylistInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addToQueue: (task: DownloadTask) => void;
  updateTask: (taskId: string, updates: Partial<DownloadTask>) => void;
  removeFromQueue: (taskId: string) => void;
  clearCompleted: () => void;
  setQueue: (tasks: DownloadTask[]) => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  currentVideo: null,
  currentPlaylist: null,
  downloadQueue: [],
  isLoading: false,
  error: null,

  setCurrentVideo: (video) => set({ currentVideo: video }),
  setCurrentPlaylist: (playlist) => set({ currentPlaylist: playlist }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addToQueue: (task) =>
    set((state) => ({
      downloadQueue: [...state.downloadQueue, task],
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      downloadQueue: state.downloadQueue.map((task) =>
        task.taskId === taskId ? { ...task, ...updates } : task
      ),
    })),

  removeFromQueue: (taskId) =>
    set((state) => ({
      downloadQueue: state.downloadQueue.filter((t) => t.taskId !== taskId),
    })),

  clearCompleted: () =>
    set((state) => ({
      downloadQueue: state.downloadQueue.filter(
        (t) => !['complete', 'failed', 'cancelled'].includes(t.status)
      ),
    })),

  setQueue: (tasks) => set({ downloadQueue: tasks }),
}));