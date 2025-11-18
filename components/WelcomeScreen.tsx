
import React from 'react';
import { ModelIcon } from './ModelIcon';
import { Model } from '../types';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div className="max-w-2xl w-full">
        {/* Icons Row */}
        <div 
          className="flex justify-center items-center space-x-6 mb-8 opacity-0 animate-fade-in-up"
          style={{ animationFillMode: 'forwards' }}
        >
          <ModelIcon model={Model.GEMINI} className="w-12 h-12 text-text-secondary" />
          <ModelIcon model={Model.NEXZI_IVISION_1O} className="w-12 h-12 text-text-secondary" />
          <ModelIcon model={Model.INSANITY_V1} className="w-12 h-12 text-text-secondary" />
          <ModelIcon model={Model.CORE_NEXZI} className="w-12 h-12 text-text-secondary" />
        </div>
        
        {/* Title */}
        <h1 
          className="text-4xl md:text-5xl font-bold text-text-primary mb-4 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          Welcome to MulitiDash
        </h1>
        
        {/* Subtitle */}
        <p 
          className="text-lg text-text-secondary mb-10 max-w-xl mx-auto opacity-0 animate-fade-in-up"
          style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
        >
          Seamlessly switch between powerful AI models to compare responses, conduct research, and find the best results for any task.
        </p>
        
        {/* Start Button */}
        <div 
          className="opacity-0 animate-fade-in-up"
          style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
        >
          <button
            onClick={onStart}
            className="px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 focus:outline-none bg-accent text-white hover:bg-accent-hover transform hover:scale-105 focus:ring-4 focus:ring-offset-2 focus:ring-offset-primary focus:ring-accent"
          >
            Start a Conversation
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;