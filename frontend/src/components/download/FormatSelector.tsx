import React, { useMemo } from 'react';
import { VideoFormat, AudioFormat } from '../../types';
import { Select } from '../common/Select';
import { Button } from '../common/Button';

interface FormatSelectorProps {
  videoFormats: VideoFormat[];
  audioFormats: AudioFormat[];
  selectedType: 'video' | 'audio';
  selectedFormat: string;
  onTypeChange: (type: 'video' | 'audio') => void;
  onFormatChange: (formatId: string) => void;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  videoFormats,
  audioFormats,
  selectedType,
  selectedFormat,
  onTypeChange,
  onFormatChange,
}) => {
  const formatSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const videoOptions = useMemo(() => {
    if (!videoFormats || !Array.isArray(videoFormats)) return [];
    return videoFormats
      .sort((a, b) => {
        // Sort by resolution priority
        const resolutionOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];
        const aIndex = resolutionOrder.indexOf(a.resolution);
        const bIndex = resolutionOrder.indexOf(b.resolution);
        return aIndex - bIndex;
      })
      .map(format => ({
        value: format.formatId,
        label: `${format.resolution} (${format.ext.toUpperCase()}) - ${formatSize(format.filesize)}`
      }));
  }, [videoFormats]);

  const audioOptions = useMemo(() => {
    if (!audioFormats || !Array.isArray(audioFormats)) return [];
    return audioFormats
      .sort((a, b) => b.bitrate - a.bitrate)
      .map(format => ({
        value: format.formatId,
        label: `${Math.round(format.bitrate)} kbps (${format.ext.toUpperCase()}) - ${formatSize(format.filesize)}`
      }));
  }, [audioFormats]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Select Format
      </h3>

      {/* Format Type Toggle */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={selectedType === 'video' ? 'primary' : 'secondary'}
          onClick={() => onTypeChange('video')}
          disabled={videoFormats.length === 0}
        >
          Video ({videoFormats.length} formats)
        </Button>
        <Button
          variant={selectedType === 'audio' ? 'primary' : 'secondary'}
          onClick={() => onTypeChange('audio')}
          disabled={audioFormats.length === 0}
        >
          Audio Only ({audioFormats.length} formats)
        </Button>
      </div>

      {/* Format Selection */}
      <div className="space-y-4">
        {selectedType === 'video' && videoFormats.length > 0 && (
          <Select
            label="Video Quality"
            options={videoOptions}
            value={selectedFormat}
            onChange={(e) => onFormatChange(e.target.value)}
            placeholder="Select video quality"
          />
        )}

        {selectedType === 'audio' && audioFormats.length > 0 && (
          <Select
            label="Audio Quality"
            options={audioOptions}
            value={selectedFormat}
            onChange={(e) => onFormatChange(e.target.value)}
            placeholder="Select audio quality"
          />
        )}

        {selectedType === 'video' && videoFormats.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No video formats available
          </div>
        )}

        {selectedType === 'audio' && audioFormats.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No audio formats available
          </div>
        )}
      </div>

      {/* Format Info */}
      {selectedFormat && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Selected Format Details:
          </h4>
          {selectedType === 'video' && (
            (() => {
              const format = videoFormats.find(f => f.formatId === selectedFormat);
              return format ? (
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Resolution:</dt>
                    <dd className="font-medium">{format.resolution}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">FPS:</dt>
                    <dd className="font-medium">{format.fps}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Codec:</dt>
                    <dd className="font-medium">{format.vcodec}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">File Size:</dt>
                    <dd className="font-medium">{formatSize(format.filesize)}</dd>
                  </div>
                </dl>
              ) : null;
            })()
          )}
          {selectedType === 'audio' && (
            (() => {
              const format = audioFormats.find(f => f.formatId === selectedFormat);
              return format ? (
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Bitrate:</dt>
                    <dd className="font-medium">{format.bitrate} kbps</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Codec:</dt>
                    <dd className="font-medium">{format.acodec}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Format:</dt>
                    <dd className="font-medium">{format.ext.toUpperCase()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">File Size:</dt>
                    <dd className="font-medium">{formatSize(format.filesize)}</dd>
                  </div>
                </dl>
              ) : null;
            })()
          )}
        </div>
      )}
    </div>
  );
};