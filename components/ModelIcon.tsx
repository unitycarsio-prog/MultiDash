
import React from 'react';
import { Model } from '../types';
import { GeminiIcon } from './icons/GeminiIcon';
import { InsanityV1Icon } from './icons/InsanityV1Icon';
import { NexziIvision1oIcon } from './icons/NexziIvision1oIcon';
import { CoreNexziIcon } from './icons/CoreNexziIcon';

interface ModelIconProps {
  model?: Model;
  className?: string;
}

export const ModelIcon: React.FC<ModelIconProps> = ({ model, className }) => {
  const props = { className: className || 'w-6 h-6' };

  switch (model) {
    case Model.GEMINI:
      return <GeminiIcon {...props} />;
    case Model.INSANITY_V1:
      return <InsanityV1Icon {...props} />;
    case Model.NEXZI_IVISION_1O:
      return <NexziIvision1oIcon {...props} />;
    case Model.CORE_NEXZI:
      return <CoreNexziIcon {...props} />;
    default:
      return <GeminiIcon {...props} />;
  }
};
