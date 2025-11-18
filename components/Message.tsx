
import React from 'react';
import { ChatMessage } from '../types';
import { UserIcon } from './icons/UserIcon';
import { ModelIcon } from './ModelIcon';

interface MessageProps {
  message: ChatMessage;
  isLoading?: boolean;
  onExecutePlan?: (message: ChatMessage) => void;
}

const Message: React.FC<MessageProps> = ({ message, isLoading = false, onExecutePlan }) => {
  const isUser = message.sender === 'user';

  const avatar = isUser ? (
    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
      <UserIcon className="w-5 h-5 text-text-secondary" />
    </div>
  ) : (
    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
      <ModelIcon model={message.model} className="w-5 h-5" />
    </div>
  );

  return (
    <div className={`flex items-start gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && avatar}
      <div
        className={`max-w-xl md:max-w-2xl px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-accent text-white'
            : `bg-secondary text-text-primary ${message.isError ? 'border border-red-500' : ''}`
        }`}
      >
        {isLoading ? (
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></span>
          </div>
        ) : (
          <div>
            <p className="whitespace-pre-wrap">{message.text}</p>

            {message.plan && onExecutePlan && (
              <div className="mt-4">
                <button
                  onClick={() => onExecutePlan(message)}
                  disabled={message.planExecuted}
                  className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none bg-accent text-white hover:bg-accent-hover disabled:bg-border-color disabled:text-text-secondary disabled:cursor-not-allowed"
                >
                  {message.planExecuted ? 'Plan Approved' : 'Continue with this plan'}
                </button>
              </div>
            )}

            {message.sources && message.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border-color">
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Sources</h4>
                <ul className="space-y-1">
                  {message.sources.map((source, index) => (
                    <li key={index} className="text-sm truncate">
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                        title={source.title}
                      >
                        {`[${index + 1}] ${source.title || source.uri}`}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
       {isUser && avatar}
    </div>
  );
};

export default Message;
