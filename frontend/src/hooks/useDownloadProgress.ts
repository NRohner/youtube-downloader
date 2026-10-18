import { useEffect } from 'react';
import { useDownloadStore } from '../store/downloadStore';
import { youtubeApi } from '../services/api';

export const useDownloadProgress = () => {
  const { downloadQueue, updateTask } = useDownloadStore();

  useEffect(() => {
    const activeTasks = downloadQueue.filter(task =>
      ['pending', 'downloading', 'processing'].includes(task.status)
    );

    if (activeTasks.length === 0) return;

    const pollInterval = setInterval(async () => {
      try {
        // Poll status for all active tasks
        const statusPromises = activeTasks.map(task =>
          youtubeApi.getDownloadStatus(task.taskId)
            .then(status => ({ taskId: task.taskId, status }))
            .catch(error => ({ taskId: task.taskId, error }))
        );

        const results = await Promise.all(statusPromises);

        results.forEach(result => {
          if ('status' in result && result.status) {
            updateTask(result.taskId, result.status);
          }
        });
      } catch (error) {
        console.error('Failed to poll download status:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [downloadQueue, updateTask]);

  return { downloadQueue };
};