

import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { blobToBase64 } from '../utils';
import { cls } from '../utils';

interface ChatInputProps {
  onSend: (text: string) => void;
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;
  isLiveSessionActive: boolean;
  onToggleLiveSession: () => void;
}

const MicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

const SendIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <path d="M12 19V5" />
       <path d="M5 12l7-7 7 7" />
    </svg>
);

const LiveVoiceIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9v6" />
        <path d="M10 6v12" />
        <path d="M14 7.5v9" />
        <path d="M18 9v6" />
    </svg>
);


export function ChatInput({ onSend, onFileSelect, isLoading, disabled = false, isLiveSessionActive, onToggleLiveSession }: ChatInputProps) {
  const [value, setValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const send = () => {
    if (!value.trim() || isLoading || disabled || isLiveSessionActive) return;
    onSend(value.trim());
    setValue("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };
  
  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = { mimeType: 'audio/webm' };
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          stream.getTracks().forEach(track => track.stop());
          
          setIsRecording(false);
          setIsTranscribing(true);

          try {
            const base64Audio = await blobToBase64(audioBlob);
            const transcription = await transcribeAudio(base64Audio, mimeType);
            setValue(prev => (prev ? prev.trim() + ' ' : '') + transcription);
          } catch (error) {
            alert(`Transcription failed: ${error instanceof Error ? error.message : String(error)}`);
            console.error("Transcription error:", error);
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access was denied. Please allow microphone access in your browser settings to use this feature.");
      }
    }
  };

  const isParentBusy = isLoading || disabled;
  const isInputDisabled = isParentBusy || isRecording || isTranscribing || isLiveSessionActive;
  const isMicDisabled = (isParentBusy || isTranscribing || isLiveSessionActive) && !isRecording;
  const hasText = value.trim() !== "";

  const getPlaceholderText = () => {
      if (isLoading) return "Neura is thinking...";
      if (isLiveSessionActive) return "Live conversation is active...";
      if (isRecording) return "Recording for transcription...";
      if (isTranscribing) return "Transcribing audio...";
      if (disabled) return "Create a goal to start chatting";
      return "Ask anything...";
  }

  return (
    <div className="flex items-center gap-2 rounded-3xl bg-[#2f2f2f] px-4 py-3 shadow-lg">
      <button 
        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" 
        title="Attach"
        onClick={() => fileInputRef.current?.click()}
        disabled={isInputDisabled}
        aria-label="Attach file"
        >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <input 
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={isInputDisabled}
      />
      <input 
        className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 text-[15px] disabled:opacity-50" 
        placeholder={getPlaceholderText()}
        value={value} 
        onChange={(e) => setValue(e.target.value)} 
        onKeyDown={(e) => { if (e.key === "Enter" && hasText) send() }} 
        disabled={isInputDisabled} 
      />
      
      <button
        className={cls(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50",
           isRecording && "bg-red-500 text-white hover:bg-red-600",
        )}
        onClick={handleMicClick}
        title={isRecording ? "Stop recording" : "Transcribe voice to text"}
        disabled={isMicDisabled}
        aria-label={isRecording ? "Stop recording" : "Start voice transcription"}
      >
        {isTranscribing ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
        ) : isRecording ? (
            <StopIcon />
        ) : (
            <MicIcon />
        )}
      </button>

      <button
        className={cls(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
          isLiveSessionActive
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white text-black hover:bg-gray-200 disabled:bg-gray-200 disabled:text-gray-500",
        )}
        onClick={hasText ? send : onToggleLiveSession}
        title={hasText ? "Send" : (isLiveSessionActive ? "End conversation" : "Start live voice conversation")}
        disabled={hasText ? (isInputDisabled || !value.trim()) : isParentBusy}
        aria-label={hasText ? "Send message" : (isLiveSessionActive ? "End live conversation" : "Start live voice conversation")}
      >
        {isLoading && hasText ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
        ) : isLiveSessionActive ? (
            <StopIcon />
        ) : hasText ? (
            <SendIcon />
        ) : (
            <LiveVoiceIcon />
        )}
      </button>
    </div>
  );
}