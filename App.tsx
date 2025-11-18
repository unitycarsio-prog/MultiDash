

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { ChatMessage, Model, ChatHistories } from './types';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import WelcomeScreen from './components/WelcomeScreen';
import LiveMode from './components/LiveMode';
import { sendMessageToModel, executeResearchPlan, resetGeminiChat } from './services/api';
import { encode, decode, decodeAudioData } from './utils/audio';

const App: React.FC = () => {
  const [histories, setHistories] = useState<ChatHistories>(() => {
    try {
      const savedHistories = localStorage.getItem('chatHistories');
      return savedHistories ? JSON.parse(savedHistories) : {};
    } catch (error) {
      console.error('Failed to parse chat histories from localStorage', error);
      return {};
    }
  });
  
  const [selectedModel, setSelectedModel] = useState<Model>(Model.GEMINI);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [isLiveModeActive, setIsLiveModeActive] = useState<boolean>(false);

  // Talk to AI Mode State
  const [isTalkModeActive, setIsTalkModeActive] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem('chatHistories', JSON.stringify(histories));
    } catch (error) {
      console.error('Failed to save chat histories to localStorage', error);
    }
  }, [histories]);

  const handleNewChat = useCallback(() => {
    if (selectedModel === Model.GEMINI) {
      resetGeminiChat();
    }
    setHistories(prev => ({
      ...prev,
      [selectedModel]: [],
    }));
  }, [selectedModel]);
  
  const toggleLiveMode = useCallback(() => {
    setIsLiveModeActive(prev => !prev);
  }, []);

  const stopTalkMode = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    setIsTalkModeActive(false);
    setIsConnecting(false);
    setCurrentTranscription('');
  }, []);

  const handleToggleTalkMode = useCallback(async () => {
    if (isConnecting) return; // Ignore clicks while connecting

    if (isTalkModeActive) {
      stopTalkMode();
      return;
    }

    setIsConnecting(true);
    setCurrentTranscription('');
    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
      sourcesRef.current = new Set();
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsTalkModeActive(true);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }

              const pcmBlob: GenAIBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscription += text;
            } else if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscription += text;
              setCurrentTranscription(currentOutputTranscription);
            }

            if (message.serverContent?.turnComplete) {
              const finalInput = currentInputTranscription.trim();
              const finalOutput = currentOutputTranscription.trim();
              
              if (finalInput || finalOutput) {
                setHistories(prev => {
                  const currentHistory = prev[selectedModel] || [];
                  const newMessages: ChatMessage[] = [];
                  if (finalInput) {
                    newMessages.push({ id: Date.now() + Math.random(), text: finalInput, sender: 'user' });
                  }
                  if (finalOutput) {
                    newMessages.push({ id: Date.now() + Math.random(), text: finalOutput, sender: 'bot', model: selectedModel });
                  }
                  return { ...prev, [selectedModel]: [...currentHistory, ...newMessages] };
                });
              }
              
              currentInputTranscription = '';
              currentOutputTranscription = '';
              setCurrentTranscription('');
            }
            
            try {
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
              if (base64Audio && outputAudioContextRef.current && outputAudioContextRef.current.state === 'running') {
                  nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                  const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                  
                  if (outputAudioContextRef.current && outputAudioContextRef.current.state === 'running') {
                    const source = outputAudioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode);
                    source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                  }
              }
            } catch (error) {
              console.error("Error processing audio message:", error);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            stopTalkMode();
          },
          onclose: (e: CloseEvent) => {
            stopTalkMode();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

    } catch (error) {
      console.error("Failed to start talk mode:", error);
      stopTalkMode();
    }
  }, [isTalkModeActive, isConnecting, stopTalkMode, selectedModel]);
  
  useEffect(() => {
    return () => {
      stopTalkMode();
    }
  }, [stopTalkMode]);


  const handleSendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    const userMessage: ChatMessage = { id: Date.now() + Math.random(), text: prompt, sender: 'user' };
    setHistories(prev => {
        const currentHistory = prev[selectedModel] || [];
        return { ...prev, [selectedModel]: [...currentHistory, userMessage] };
    });
    setIsLoading(true);

    try {
      const botResponse = await sendMessageToModel(prompt, selectedModel);
      const botMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        text: botResponse.text,
        sender: 'bot',
        model: selectedModel,
        sources: botResponse.sources,
        plan: botResponse.plan,
        planExecuted: false,
      };
      setHistories(prev => ({ ...prev, [selectedModel]: [...(prev[selectedModel] || []), botMessage] }));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      const errorMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        text: `An error occurred with ${selectedModel}: ${errorText}`,
        sender: 'bot',
        model: selectedModel,
        isError: true,
      };
      setHistories(prev => ({ ...prev, [selectedModel]: [...(prev[selectedModel] || []), errorMessage] }));
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel]);

  const handleExecutePlan = useCallback(async (messageWithPlan: ChatMessage) => {
    if (!messageWithPlan.plan || messageWithPlan.planExecuted) return;

    const planModel = messageWithPlan.model;
    if (!planModel) {
      console.error("Cannot execute plan: message is missing a 'model' property.");
      return;
    }

    setHistories(prev => {
      const currentHistory = prev[planModel] || [];
      const updatedHistory = currentHistory.map(msg =>
        msg.id === messageWithPlan.id ? { ...msg, planExecuted: true } : msg
      );
      return { ...prev, [planModel]: updatedHistory };
    });

    setIsLoading(true);

    try {
      const botResponse = await executeResearchPlan(messageWithPlan.plan.originalPrompt);
      const botMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        text: botResponse.text,
        sender: 'bot',
        model: planModel,
        sources: botResponse.sources,
      };
      setHistories(prev => ({
        ...prev,
        [planModel]: [...(prev[planModel] || []), botMessage],
      }));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      const errorMessage: ChatMessage = {
        id: Date.now() + Math.random(),
        text: `An error occurred while executing the plan: ${errorText}`,
        sender: 'bot',
        model: planModel,
        isError: true,
      };
      setHistories(prev => ({
        ...prev,
        [planModel]: [...(prev[planModel] || []), errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const messages = histories[selectedModel] || [];

  if (isLiveModeActive) {
    return (
      <LiveMode 
        onExit={toggleLiveMode}
        setHistories={setHistories}
        selectedModel={selectedModel}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-primary font-sans">
      {isChatting ? (
        <>
          <Header 
            selectedModel={selectedModel} 
            onModelChange={setSelectedModel} 
            onNewChat={handleNewChat}
            onToggleLiveMode={toggleLiveMode}
          />
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onExecutePlan={handleExecutePlan}
            selectedModel={selectedModel}
            isTalkModeActive={isTalkModeActive}
            isConnecting={isConnecting}
            onToggleTalkMode={handleToggleTalkMode}
            currentTranscription={currentTranscription}
          />
        </>
      ) : (
        <WelcomeScreen onStart={() => setIsChatting(true)} />
      )}
    </div>
  );
};

export default App;
