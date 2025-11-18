
import React from 'react';
import { Model } from '../types';
import ModelSelector from './ModelSelector';
import { NewChatIcon } from './icons/NewChatIcon';
import { MicIcon } from './icons/MicIcon';

interface HeaderProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
  onNewChat: () => void;
  onToggleLiveMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ selectedModel, onModelChange, onNewChat, onToggleLiveMode }) => {
  return (
    <header className="flex-shrink-0 z-10 p-4 flex items-center justify-between border-b border-border-color">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-text-primary hidden sm:block">
          MulitiDash
        </h1>
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none bg-secondary text-text-primary hover:bg-border-color"
          title="Start a new chat"
        >
          <NewChatIcon className="w-4 h-4" />
          <span className="hidden md:inline">New Chat</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLiveMode}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none bg-secondary text-text-primary hover:bg-border-color"
          title="Enter Live Talk"
        >
          <MicIcon className="w-4 h-4" />
           <span className="hidden md:inline">Live Talk</span>
        </button>
        <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
      </div>
    </header>
  );
};

export default Header;