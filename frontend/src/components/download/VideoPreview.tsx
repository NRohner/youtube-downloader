import React from 'react';
import { Clock, Eye, User, Calendar } from 'lucide-react';
import { VideoInfo } from '../../types';

interface VideoPreviewProps {
  video: VideoInfo;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ video }) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number | undefined): string => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-video relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-sm px-2 py-1 rounded">
          {formatDuration(video.duration)}
        </div>
      </div>

      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
          {video.title}
        </h2>

        <div className="flex items-center text-sm text-gray-600 space-x-4 mb-4">
          {video.channel && (
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              <span>{video.channel}</span>
            </div>
          )}
          {video.viewCount && (
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              <span>{formatNumber(video.viewCount)} views</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>Duration: {formatDuration(video.duration)}</span>
          </div>
          {video.uploadDate && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                {new Date(video.uploadDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {(video.availableVideoFormats?.length || 0)} video formats available
          </span>
          <span className="text-gray-600">
            {(video.availableAudioFormats?.length || 0)} audio formats available
          </span>
        </div>

        {video.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 line-clamp-3">
              {video.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};