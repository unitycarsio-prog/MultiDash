
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Model } from '../types';
import Message from './Message';
import { SendIcon } from './icons/SendIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { MicIcon } from './icons/MicIcon';
import { ModelIcon } from './ModelIcon';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (prompt: string) => void;
  onExecutePlan: (message: ChatMessage) => void;
  selectedModel: Model;
  isTalkModeActive: boolean;
  isConnecting: boolean;
  onToggleTalkMode: () => void;
  currentTranscription: string;
}

const LoadingSpinner: React.FC = () => (
    <div className="w-5 h-5 border-2 border-text-secondary border-t-transparent rounded-full animate-spin"></div>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isLoading, 
  onSendMessage, 
  onExecutePlan, 
  selectedModel,
  isTalkModeActive,
  isConnecting,
  onToggleTalkMode,
  currentTranscription 
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  
  useEffect(() => {
    setInputValue('');
  }, [selectedModel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
        onSendMessage(inputValue);
        const textarea = e.currentTarget.querySelector('textarea');
        if (textarea) {
            textarea.style.height = 'auto';
        }
        setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const promptSuggestions = [
    "Explain quantum computing in simple terms",
    "What are some creative recipe ideas for dinner?",
    "Write a short story in the style of Edgar Allan Poe",
    "How do I create a pivot table in Excel?"
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
       {messages.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 mb-4 bg-secondary rounded-full flex items-center justify-center">
            <ModelIcon model={selectedModel} className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary mb-8">How can I help you today?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
            {promptSuggestions.map((prompt, index) => (
               <button
                 key={index}
                 onClick={() => onSendMessage(prompt)}
                 className="p-4 bg-secondary rounded-xl text-left hover:bg-border-color transition-colors duration-200"
               >
                 <p className="text-text-primary font-semibold">{prompt.split('?')[0]}</p>
                 <p className="text-text-secondary text-sm">{prompt.split('?')[1] || ' '}</p>
               </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} onExecutePlan={onExecutePlan} />
            ))}
            {isLoading && !isTalkModeActive && (
              <Message message={{ id: 0, text: '...', sender: 'bot', model: selectedModel }} isLoading={true} />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <div className="bg-primary p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {isTalkModeActive && (
            <div className="text-center p-2 text-text-secondary h-8">
              <p className="truncate">{currentTranscription || "AI is listening..."}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative flex items-end bg-secondary border border-border-color rounded-xl p-2">
            <button type="button" disabled className="p-2 text-text-secondary cursor-not-allowed">
              <PaperclipIcon className="w-5 h-5" />
            </button>
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isTalkModeActive ? "Listening..." : `Message ${selectedModel}...`}
              className="flex-1 bg-transparent text-text-primary placeholder-text-secondary resize-none outline-none px-2 max-h-40"
              rows={1}
              disabled={isLoading || isTalkModeActive}
            />
            <button 
              type="button" 
              onClick={onToggleTalkMode}
              disabled={isConnecting}
              className={`p-2 transition-colors duration-200 ${isTalkModeActive ? 'text-red-500' : 'text-text-secondary'} ${isConnecting ? 'cursor-wait' : 'hover:text-text-primary'}`}
              title={isTalkModeActive ? "Stop voice chat" : "Start voice chat"}
            >
              {isConnecting ? <LoadingSpinner /> : <MicIcon className="w-5 h-5" />}
            </button>
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim() || isTalkModeActive}
              className="ml-2 flex-shrink-0 w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center transition-colors duration-200 disabled:bg-border-color disabled:cursor-not-allowed hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent"
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>
          <p className="text-xs text-center text-text-secondary mt-2 px-4">AI can make mistakes. Consider checking important information.</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
