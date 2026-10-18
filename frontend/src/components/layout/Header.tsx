import React from 'react';
import { Download } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Download className="h-8 w-8 text-primary-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-900">
              YouTube Downloader
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Download videos and audio from YouTube
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};