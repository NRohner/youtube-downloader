import { useState } from 'react';
import { Download } from 'lucide-react';
import { PlaylistInfo, PlaylistQuality, VideoInfo } from '../../types';
import { Button } from '../common/Button';
import { Select } from '../common/Select';

interface PlaylistViewProps {
  playlist: PlaylistInfo;
  onSelect: (video: VideoInfo) => void;
  onDownloadAll: (quality: PlaylistQuality) => void;
  disabled?: boolean;
}

// Videos lacking the chosen resolution fall back to their best available
const QUALITIES: { value: PlaylistQuality; label: string }[] = [
  { value: 'best', label: 'Best available' },
  { value: '2160p', label: '4K (2160p)' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: 'audio', label: 'Audio only (MP3)' },
];

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
  return h ? `${h}:${mmss}` : mmss;
};

export const PlaylistView = ({ playlist, onSelect, onDownloadAll, disabled }: PlaylistViewProps) => {
  const [quality, setQuality] = useState<PlaylistQuality>('best');
  const label = QUALITIES.find((q) => q.value === quality)?.label;

  const handleDownloadAll = () => {
    if (window.confirm(`Queue all ${playlist.videoCount} videos (${label})? They download one at a time.`)) {
      onDownloadAll(quality);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900">{playlist.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{playlist.videoCount} videos</p>
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <Select
            label="Quality for all"
            value={quality}
            onChange={(e) => setQuality(e.target.value as PlaylistQuality)}
            options={QUALITIES}
          />
        </div>
        <Button onClick={handleDownloadAll} disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          Download all
        </Button>
      </div>
      <ul className="divide-y divide-gray-200">
        {playlist.videos.map((video) => (
          <li key={video.videoId} className="flex items-center gap-4 py-3">
            <img src={video.thumbnail} alt="" className="h-14 w-24 rounded object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">{video.title}</p>
              <p className="text-xs text-gray-500">{formatDuration(video.duration)}</p>
            </div>
            <Button size="sm" disabled={disabled} onClick={() => onSelect(video)}>Select</Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
