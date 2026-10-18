import React, { useEffect, useState } from 'react';
import { Trash2, RefreshCw, Pause, Play, XCircle, Download } from 'lucide-react';
import { DownloadTask } from '../../types';
import { DownloadProgress } from '../download/DownloadProgress';
import { Button } from '../common/Button';
import { youtubeApi } from '../../services/api';

interface DownloadQueueProps {
  tasks: DownloadTask[];
  onTaskUpdate: (taskId: string, updates: Partial<DownloadTask>) => void;
  onTaskRemove: (taskId: string) => void;
  onRefresh: () => void;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  tasks,
  onTaskUpdate,
  onTaskRemove,
  onRefresh,
}) => {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    youtubeApi.getQueueState().then((s) => setPaused(s.paused)).catch(() => {});
  }, []);

  const togglePause = async () => {
    try {
      setPaused((await youtubeApi.setQueuePaused(!paused)).paused);
    } catch (error) {
      console.error('Failed to change queue state:', error);
    }
  };

  const cancelAll = async () => {
    if (!window.confirm('Cancel all pending and running downloads?')) return;
    try {
      await youtubeApi.cancelAll();
      activeTasks.forEach((t) => onTaskUpdate(t.taskId, { status: 'cancelled' }));
    } catch (error) {
      console.error('Failed to cancel all downloads:', error);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await youtubeApi.cancelDownload(taskId);
      onTaskUpdate(taskId, { status: 'cancelled' });
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  const handleDownload = (taskId: string) => {
    const downloadUrl = youtubeApi.downloadFile(taskId);
    window.open(downloadUrl, '_blank');
  };

  // Deletes the file and record on the server, then drops the row
  const handleRemove = async (taskId: string) => {
    try {
      await youtubeApi.removeDownload(taskId);
      onTaskRemove(taskId);
    } catch (error) {
      console.error('Failed to remove download:', error);
    }
  };

  const clearCompleted = () => {
    const completedTasks = tasks.filter(task =>
      ['complete', 'failed', 'cancelled'].includes(task.status)
    );
    completedTasks.forEach(task => handleRemove(task.taskId));
  };

  const activeTasks = tasks.filter(task =>
    !['complete', 'failed', 'cancelled'].includes(task.status)
  );
  const completedTasks = tasks.filter(task =>
    ['complete', 'failed', 'cancelled'].includes(task.status)
  );

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Download className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No downloads yet
        </h3>
        <p className="text-gray-500">
          Start by pasting a YouTube URL above
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Download Queue ({tasks.length})
        </h2>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {activeTasks.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={togglePause}>
                {paused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                {paused ? 'Resume Queue' : 'Pause Queue'}
              </Button>
              <Button variant="danger" size="sm" onClick={cancelAll}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel All
              </Button>
            </>
          )}
          {completedTasks.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearCompleted}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Completed
            </Button>
          )}
        </div>
      </div>

      {paused && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          Queue paused. The current download will finish, then nothing new starts until you resume.
        </div>
      )}

      {/* Queue Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">
            {activeTasks.filter(t => t.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">
            {activeTasks.filter(t => ['downloading', 'processing'].includes(t.status)).length}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">
            {completedTasks.filter(t => t.status === 'complete').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-red-600">
            {completedTasks.filter(t => ['failed', 'cancelled'].includes(t.status)).length}
          </div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
      </div>

      {/* Active Downloads */}
      {activeTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Active Downloads ({activeTasks.length})
          </h3>
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <DownloadProgress
                key={task.taskId}
                task={task}
                onCancel={() => handleCancel(task.taskId)}
                onDownload={() => handleDownload(task.taskId)}
                onRemove={() => handleCancel(task.taskId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Downloads */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Completed Downloads ({completedTasks.length})
          </h3>
          <div className="space-y-4">
            {completedTasks.map((task) => (
              <DownloadProgress
                key={task.taskId}
                task={task}
                onCancel={() => handleCancel(task.taskId)}
                onDownload={() => handleDownload(task.taskId)}
                onRemove={() => handleRemove(task.taskId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};