import { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export const UrlInput = ({ onSubmit, isLoading }: UrlInputProps) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(input.trim());
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setError(null);
    onSubmit(trimmedUrl);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={handleUrlChange}
                error={error || undefined}
                disabled={isLoading}
                className="w-full"
              />
            </div>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!url.trim() || isLoading}
              className="px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Loading...' : 'Get Info'}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Supported formats:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Single videos: https://www.youtube.com/watch?v=...</li>
              <li>Short URLs: https://youtu.be/...</li>
              <li>Playlists: https://www.youtube.com/playlist?list=...</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};