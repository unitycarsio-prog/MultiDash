
import { GoogleGenAI, Chat } from "@google/genai";
import { Model, Source } from '../types';

interface ModelResponse {
  text: string;
  sources?: Source[];
  plan?: {
    originalPrompt: string;
  };
}

// --- Gemini Flash Service ---
let geminiChat: Chat | null = null;
const getGeminiChat = () => {
  if (!geminiChat) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    geminiChat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a helpful and concise chatbot. IMPORTANT: Do not use any markdown formatting like asterisks (*) or hashes (#). Use simple text and line breaks.",
      },
    });
  }
  return geminiChat;
};

// Exported function to reset the chat session
export const resetGeminiChat = () => {
  geminiChat = null;
};

const sendToGemini = async (prompt: string): Promise<ModelResponse> => {
  const chat = getGeminiChat();
  const response = await chat.sendMessage({ message: prompt });
  return { text: response.text };
};

// --- NexziIvision1o (Research) Service ---

// Step 1: Propose a plan
const proposeResearchPlan = async (prompt: string): Promise<ModelResponse> => {
  console.log(`Proposing research plan for: ${prompt}`);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a research assistant. A user has asked for research on the following topic: "${prompt}".
Your task is to create a structured research plan. Do not perform the research yet, just propose the plan.
The plan should be a series of clear steps.
IMPORTANT: Do not use any markdown formatting like asterisks (*) or hashes (#). Use simple text and line breaks.`,
  });

  return { 
    text: response.text, 
    plan: { originalPrompt: prompt } 
  };
};

// Step 2: Execute the plan (exported for use in App.tsx)
export const executeResearchPlan = async (originalPrompt: string): Promise<ModelResponse> => {
  console.log(`Executing research plan for: ${originalPrompt}`);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a research assistant. Execute the following research query based on a Google search: "${originalPrompt}".
Provide a comprehensive answer based on the search results.
IMPORTANT: Do not use any markdown formatting like asterisks (*) or hashes (#). Use simple text and line breaks.`,
    config: {
      tools: [{googleSearch: {}}],
    },
  });

  const text = response.text;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const sources: Source[] = groundingChunks
    .map((chunk: any) => chunk.web)
    .filter((web: any): web is { uri: string; title: string } => web && web.uri)
    .map((web: { uri: string; title: string }) => ({
      uri: web.uri,
      title: web.title || web.uri,
    }));
    
  const uniqueSources = Array.from(new Map(sources.map(item => [item['uri'], item])).values());

  return { text, sources: uniqueSources };
};

// --- Mock Model Services ---
const sendToInsanityV1 = async (prompt: string): Promise<ModelResponse> => {
  console.log(`Sending to mock InsanityV1 (Coding): ${prompt}`);
  await new Promise(resolve => setTimeout(resolve, 1000)); 
  const text = `// Mock response from InsanityV1 for your prompt:\n// "${prompt}"\n\nfunction helloWorld() {\n  console.log("Hello, World!");\n}\n\nhelloWorld();`;
  return { text };
};

const sendToCoreNexzi = async (prompt: string): Promise<ModelResponse> => {
    console.log(`Sending to mock CoreNexzi (Complex Tasks): ${prompt}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const text = `Analyzing the complex task: "${prompt}"\n\nHere is a detailed breakdown:\n- Step 1: Deconstruct the primary components of the request.\n- Step 2: Analyze the interdependencies and potential challenges.\n- Step 3: Formulate a multi-faceted solution strategy.\n\nConclusion: The task is feasible with the right approach.`;
    return { text };
};


// --- Main API Router ---
export const sendMessageToModel = async (prompt: string, model: Model): Promise<ModelResponse> => {
  switch (model) {
    case Model.GEMINI:
      return sendToGemini(prompt);
    case Model.INSANITY_V1:
      return sendToInsanityV1(prompt);
    case Model.NEXZI_IVISION_1O:
      return proposeResearchPlan(prompt);
    case Model.CORE_NEXZI:
      return sendToCoreNexzi(prompt);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
};