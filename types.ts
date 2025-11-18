
export enum Model {
  GEMINI = 'Gemini Flash',
  INSANITY_V1 = 'InsanityV1',
  NEXZI_IVISION_1O = 'NexziIvision1o',
  CORE_NEXZI = 'CoreNexzi',
}

export type Sender = 'user' | 'bot';

export interface Source {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: Sender;
  model?: Model;
  isError?: boolean;
  sources?: Source[];
  plan?: {
    originalPrompt: string;
  };
  planExecuted?: boolean;
}

export type ChatHistories = {
  [key in Model]?: ChatMessage[];
};
