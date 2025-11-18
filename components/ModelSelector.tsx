
import React, { useState, useRef, useEffect } from 'react';
import { Model } from '../types';
import { ModelIcon } from './ModelIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ModelSelectorProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
}

const modelDescriptions: Record<Model, string> = {
  [Model.GEMINI]: "A fast and versatile model for general chat, summarization, and creative tasks.",
  [Model.INSANITY_V1]: "Specialized for generating and explaining code across various programming languages.",
  [Model.NEXZI_IVISION_1O]: "Designed for in-depth research, providing answers with sourced information from the web.",
  [Model.CORE_NEXZI]: "Optimized for breaking down and solving complex, multi-step problems.",
};

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const models = Object.values(Model);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleModelSelect = (model: Model) => {
    onModelChange(model);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none bg-secondary text-text-primary hover:bg-border-color"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ModelIcon model={selectedModel} className="w-5 h-5" />
        <span>{selectedModel}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-56 bg-secondary border border-border-color rounded-lg shadow-lg z-20"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {models.map((model) => (
              <div key={model} className="relative group">
                <button
                  onClick={() => handleModelSelect(model)}
                  className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-border-color transition-colors duration-150"
                  role="menuitem"
                >
                  <ModelIcon model={model} className="w-5 h-5" />
                  <span>{model}</span>
                </button>
                <div 
                  className="absolute right-full top-1/2 -translate-y-1/2 mr-2 w-60 p-3 bg-primary border border-border-color rounded-lg text-sm text-text-secondary shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 invisible group-hover:visible"
                  role="tooltip"
                >
                  <h4 className="font-bold text-text-primary mb-1">{model}</h4>
                  <p>{modelDescriptions[model]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
