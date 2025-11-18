



import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { encode, decode, decodeAudioData } from '../utils/audio';
import { Model, ChatHistories, ChatMessage } from '../types';
import { ModelIcon } from './ModelIcon';
import { MicIcon } from './icons/MicIcon';
import { MicOffIcon } from './icons/MicOffIcon';
import { PhoneIcon } from './icons/PhoneIcon';

interface LiveModeProps {
  onExit: () => void;
  setHistories: React.Dispatch<React.SetStateAction<ChatHistories>>;
  selectedModel: Model;
}

const LiveMode: React.FC<LiveModeProps> = ({ onExit, setHistories, selectedModel }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioResourcesRef = useRef<any>({});
  const fullTranscriptRef = useRef<{user: string[], bot: string[]}>({ user: [], bot: [] });

  const stopSession = useCallback(() => {
    const audio = audioResourcesRef.current;
    if (audio.scriptProcessor) audio.scriptProcessor.disconnect();
    if (audio.microphoneStream) audio.microphoneStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    if (audio.inputAudioContext && audio.inputAudioContext.state !== 'closed') audio.inputAudioContext.close();
    if (audio.outputAudioContext && audio.outputAudioContext.state !== 'closed') audio.outputAudioContext.close();
    if (audio.sources) audio.sources.forEach((source: AudioBufferSourceNode) => source.stop());
    audioResourcesRef.current = {};
    
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(console.error);
      sessionPromiseRef.current = null;
    }
    
    setStatus('idle');
  }, []);

  useEffect(() => {
    const audio = audioResourcesRef.current;
    if (audio.microphoneStream) {
      audio.microphoneStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  const startSession = async () => {
    if (status === 'connecting' || status === 'active') return;

    setStatus('connecting');
    setTranscription('');
    fullTranscriptRef.current = { user: [], bot: [] };

    try {
      const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const sources = new Set<AudioBufferSourceNode>();
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);
      let nextStartTime = 0;
      let currentInputTranscription = '';
      let currentOutputTranscription = '';

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('active');
            const source = inputAudioContext.createMediaStreamSource(microphoneStream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            audioResourcesRef.current = { microphoneStream, inputAudioContext, outputAudioContext, scriptProcessor, sources };
            
            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              const pcmBlob: GenAIBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription += message.serverContent.inputTranscription.text;
            } else if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscription += text;
              setTranscription(prev => prev + text);
            }
            if (message.serverContent?.turnComplete) {
              if(currentInputTranscription.trim()) fullTranscriptRef.current.user.push(currentInputTranscription.trim());
              if(currentOutputTranscription.trim()) fullTranscriptRef.current.bot.push(currentOutputTranscription.trim());
              currentInputTranscription = '';
              currentOutputTranscription = '';
              setTranscription('');
            }

            try {
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
              if (base64Audio && outputAudioContext.state === 'running') {
                nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                
                if (outputAudioContext.state === 'running') {
                  const sourceNode = outputAudioContext.createBufferSource();
                  sourceNode.buffer = audioBuffer;
                  sourceNode.connect(outputNode);
                  sourceNode.addEventListener('ended', () => sources.delete(sourceNode));
                  sourceNode.start(nextStartTime);
                  nextStartTime += audioBuffer.duration;
                  sources.add(sourceNode);
                }
              }
            } catch(error) {
              console.error("Error processing live audio message:", error);
            }
          },
          onerror: (e) => {
            console.error('Live session error:', e);
            setStatus('error');
            stopSession();
          },
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

    } catch (error) {
      console.error("Failed to start live session:", error);
      setStatus('error');
    }
  };

  const handleExit = () => {
    stopSession();
    
    const newMessages: ChatMessage[] = [];
    const userTurns = fullTranscriptRef.current.user;
    const botTurns = fullTranscriptRef.current.bot;
    const turnCount = Math.max(userTurns.length, botTurns.length);

    for (let i = 0; i < turnCount; i++) {
        if (userTurns[i]) {
            newMessages.push({
                id: Date.now() + Math.random(),
                text: userTurns[i],
                sender: 'user',
            });
        }
        if (botTurns[i]) {
            newMessages.push({
                id: Date.now() + Math.random(),
                text: botTurns[i],
                sender: 'bot',
                model: selectedModel,
            });
        }
    }

    if (newMessages.length > 0) {
      setHistories(prev => {
        const currentHistory = prev[selectedModel] || [];
        return {
          ...prev,
          [selectedModel]: [...currentHistory, ...newMessages]
        }
      });
    }

    onExit();
  };
  
  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);
  
  return (
    <div className="w-full h-screen bg-primary text-text-primary flex flex-col relative items-center justify-center p-4">
      {status === 'idle' || status === 'connecting' || status === 'error' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
              {status === 'connecting' ? (
                   <>
                      <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-lg">Connecting...</p>
                   </>
              ) : (
                  <>
                    <h2 className="text-3xl font-bold mb-4">Gemini Live Talk</h2>
                    <p className="text-text-secondary mb-8 max-w-md">Start a full-screen, focused audio conversation with the AI.</p>
                    <button onClick={startSession} className="px-6 py-3 bg-accent rounded-lg font-semibold hover:bg-accent-hover transition-colors">Start Live Session</button>
                    {status === 'error' && <p className="text-red-500 mt-4">Could not connect. Please check permissions and try again.</p>}
                  </>
              )}
          </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
            <ModelIcon model={selectedModel} className="w-24 h-24 text-text-secondary mb-8" />
            <div className="min-h-[6rem] text-center">
                {transcription && (
                    <div className="bg-secondary rounded-lg p-4 text-lg">
                        <p>{transcription}</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {status === 'active' && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-secondary p-3 rounded-full shadow-lg">
              <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-full transition-colors ${'bg-border-color hover:bg-gray-600'}`}>
                  {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
              </button>
              <button onClick={handleExit} className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors">
                  <PhoneIcon className="w-6 h-6" />
              </button>
          </div>
      )}
      {(status === 'active' || status === 'error') &&
        <button onClick={handleExit} className="absolute top-4 right-4 text-sm bg-secondary px-3 py-2 rounded-lg hover:bg-border-color">Exit Live Talk</button>
      }
    </div>
  );
};

export default LiveMode;