import React from 'react';
import { Download, X, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import { DownloadTask } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { Button } from '../common/Button';

interface DownloadProgressProps {
  task: DownloadTask;
  onCancel: () => void;
  onDownload: () => void;
  onRemove: () => void;
}

const StatusIcon: React.FC<{ status: DownloadTask['status'] }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'downloading':
    case 'processing':
      return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'complete':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'cancelled':
      return <X className="h-5 w-5 text-gray-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
};

const StatusBadge: React.FC<{ status: DownloadTask['status'] }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'downloading':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'downloading':
        return 'Downloading';
      case 'processing':
        return 'Processing';
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}
    >
      {getStatusText()}
    </span>
  );
};

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  task,
  onCancel,
  onDownload,
  onRemove,
}) => {
  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return ` (${mb.toFixed(1)} MB)`;
    return ` (${(mb / 1024).toFixed(1)} GB)`;
  };

  const getProgressColor = (): 'primary' | 'success' | 'danger' => {
    if (task.status === 'failed') return 'danger';
    if (task.status === 'complete') return 'success';
    return 'primary';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <StatusIcon status={task.status} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate pr-2">
              {task.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {task.formatType === 'video' ? 'Video' : 'Audio'} download
              {formatFileSize(task.fileSize)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <StatusBadge status={task.status} />
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Remove from list"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <ProgressBar
          progress={task.progress}
          color={getProgressColor()}
          showLabel={task.status === 'downloading' || task.status === 'processing'}
        />
      </div>

      {/* Error Message */}
      {task.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Download failed:</p>
              <p className="mt-1">{task.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {task.status === 'downloading' && (
            <span>{task.progress.toFixed(1)}% complete</span>
          )}
          {task.status === 'complete' && task.completedAt && (
            <span>
              Completed at {new Date(task.completedAt).toLocaleTimeString()}
            </span>
          )}
          {task.status === 'pending' && <span>Waiting in queue...</span>}
          {task.status === 'processing' && <span>Processing video...</span>}
        </div>

        <div className="flex space-x-2">
          {(task.status === 'downloading' || task.status === 'pending') && (
            <Button variant="danger" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}

          {task.status === 'complete' && (
            <Button size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};