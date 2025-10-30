import React, { useState } from 'react';

interface PlanReviewBarProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export function PlanReviewBar({ onSend, isLoading }: PlanReviewBarProps) {
  const [value, setValue] = useState("");

  const send = () => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim());
    setValue("");
  };
  
  const isDisabled = isLoading;

  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-[#252525] p-3 shadow-lg border border-white/10 animate-[fade-in_0.2s_ease-out]">
      <div className="flex items-center gap-2">
        <input 
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 text-[15px] disabled:opacity-50 px-2" 
          placeholder={isLoading ? "Neura is thinking..." : "Request changes, or type 'confirm plan' to begin."} 
          value={value} 
          onChange={(e) => setValue(e.target.value)} 
          onKeyDown={(e) => e.key === "Enter" && send()} 
          disabled={isDisabled}
          autoFocus
        />
        <button 
          className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center text-black disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed" 
          onClick={send} 
          title="Send" 
          disabled={isDisabled || !value.trim()}
        >
          {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
          ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M12 19V5" />
                 <path d="M5 12l7-7 7 7" />
              </svg>
          )}
        </button>
      </div>
       <p className="text-xs text-center text-white/50 px-4">The plan is not final. You can ask for changes before confirming.</p>
    </div>
  );
}