import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/layout/Layout';
import { UrlInput } from './components/download/UrlInput';
import { VideoPreview } from './components/download/VideoPreview';
import { FormatSelector } from './components/download/FormatSelector';
import { DownloadQueue } from './components/queue/DownloadQueue';
import { Button } from './components/common/Button';
import { useDownloadStore } from './store/downloadStore';
import { useDownloadProgress } from './hooks/useDownloadProgress';
import { youtubeApi } from './services/api';
import { PlaylistView } from './components/playlist/PlaylistView';
import { DownloadRequest, PlaylistQuality, VideoInfo } from './types';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

const queryClient = new QueryClient();

function AppContent() {
  const [selectedType, setSelectedType] = useState<'video' | 'audio'>('video');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  const {
    currentVideo,
    setCurrentVideo,
    currentPlaylist,
    setCurrentPlaylist,
    isLoading,
    setLoading,
    error,
    setError,
    addToQueue,
    removeFromQueue,
    downloadQueue,
    updateTask,
    setQueue,
  } = useDownloadStore();

  // Use the download progress hook
  useDownloadProgress();

  // Load queue on mount
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const tasks = await youtubeApi.getQueueStatus();
        setQueue(tasks);
      } catch (error) {
        console.error('Failed to load queue:', error);
      }
    };

    loadQueue();
  }, [setQueue]);

  const showVideo = (videoInfo: VideoInfo) => {
    setCurrentVideo(videoInfo);

    // Auto-select best formats
    if (videoInfo.availableVideoFormats?.length > 0) {
      setSelectedFormat(videoInfo.availableVideoFormats[0].formatId);
      setSelectedType('video');
    } else if (videoInfo.availableAudioFormats?.length > 0) {
      setSelectedFormat(videoInfo.availableAudioFormats[0].formatId);
      setSelectedType('audio');
    }
  };

  // Playlist entries carry no formats, so fetch the full info for the picked video
  const handlePlaylistSelect = async (video: VideoInfo) => {
    setLoading(true);
    setError(null);
    try {
      showVideo(await youtubeApi.getVideoInfo(`https://www.youtube.com/watch?v=${video.videoId}`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load video information';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async (quality: PlaylistQuality) => {
    if (!currentPlaylist) return;
    setLoading(true);
    try {
      const batch = await youtubeApi.startPlaylistDownload({
        playlistUrl: `https://www.youtube.com/playlist?list=${currentPlaylist.playlistId}`,
        quality,
      });
      setQueue(await youtubeApi.getQueueStatus());
      toast.success(`Queued ${batch.totalVideos} downloads`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to queue playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    setLoading(true);
    setError(null);
    setCurrentVideo(null);
    setCurrentPlaylist(null);

    try {
      // Any URL carrying a list id (playlist page or watch?v=&list=) loads the whole playlist
      if (new URL(url).searchParams.has('list')) {
        setCurrentPlaylist(await youtubeApi.getPlaylistInfo(url));
        toast.success('Playlist loaded successfully!');
      } else {
        showVideo(await youtubeApi.getVideoInfo(url));
        toast.success('Video information loaded successfully!');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load video information';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatTypeChange = (type: 'video' | 'audio') => {
    setSelectedType(type);
    setSelectedFormat('');

    // Auto-select best format for the new type
    if (currentVideo) {
      if (type === 'video' && currentVideo.availableVideoFormats?.length > 0) {
        setSelectedFormat(currentVideo.availableVideoFormats[0].formatId);
      } else if (type === 'audio' && currentVideo.availableAudioFormats?.length > 0) {
        setSelectedFormat(currentVideo.availableAudioFormats[0].formatId);
      }
    }
  };

  const handleStartDownload = async () => {
    if (!currentVideo || !selectedFormat) {
      toast.error('Please select a format');
      return;
    }

    setIsStartingDownload(true);

    try {
      const downloadRequest: DownloadRequest = {
        url: `https://www.youtube.com/watch?v=${currentVideo.videoId}`,
        formatType: selectedType,
        formatId: selectedFormat,
      };

      const task = await youtubeApi.startDownload(downloadRequest);
      addToQueue(task);
      toast.success('Download started!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start download';
      toast.error(errorMessage);
    } finally {
      setIsStartingDownload(false);
    }
  };

  const handleRefreshQueue = async () => {
    try {
      const tasks = await youtubeApi.getQueueStatus();
      setQueue(tasks);
      toast.success('Queue refreshed');
    } catch (error) {
      toast.error('Failed to refresh queue');
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* URL Input */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YouTube Downloader
          </h1>
          <p className="text-gray-600 mb-8">
            Download videos and audio from YouTube in high quality
          </p>
          <UrlInput onSubmit={handleUrlSubmit} isLoading={isLoading} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Playlist */}
        {currentPlaylist && (
          <PlaylistView playlist={currentPlaylist} onSelect={handlePlaylistSelect}
            onDownloadAll={handleDownloadAll}
            disabled={isLoading} />
        )}

        {/* Video Preview and Format Selection */}
        {currentVideo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <VideoPreview video={currentVideo} />

            <div className="space-y-6">
              <FormatSelector
                videoFormats={currentVideo.availableVideoFormats || []}
                audioFormats={currentVideo.availableAudioFormats || []}
                selectedType={selectedType}
                selectedFormat={selectedFormat}
                onTypeChange={handleFormatTypeChange}
                onFormatChange={setSelectedFormat}
              />

              {selectedFormat && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <Button
                    onClick={handleStartDownload}
                    isLoading={isStartingDownload}
                    disabled={!selectedFormat}
                    size="lg"
                    className="w-full"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    {isStartingDownload ? 'Starting Download...' : 'Start Download'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Download Queue */}
        <div>
          <DownloadQueue
            tasks={downloadQueue}
            onTaskUpdate={updateTask}
            onTaskRemove={removeFromQueue}
            onRefresh={handleRefreshQueue}
          />
        </div>
      </div>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;