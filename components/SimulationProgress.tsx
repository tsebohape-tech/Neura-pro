import React from 'react';

interface SimulationProgressProps {
  title: string;
  subtitle: string;
  progress: number;
  onShowDetails: () => void;
}

export function SimulationProgress({ title, subtitle, progress, onShowDetails }: SimulationProgressProps) {
  return (
    <div className="rounded-2xl bg-[#121212] p-4 flex items-center justify-between gap-6 animate-[fade-in_0.2s_ease-out]">
      <div className="flex-1 overflow-hidden min-w-0 flex flex-col">
        <p className="text-white font-medium truncate">{title}</p>
        <p className="text-sm text-white/60 mt-1 truncate">{subtitle}</p>
        <div className="mt-4 w-full bg-black/50 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Strategy generation progress"
          ></div>
        </div>
      </div>
      <button
        onClick={onShowDetails}
        className="px-5 py-2 text-sm rounded-full bg-black/40 border border-white/20 text-white/90 hover:bg-white/10 flex-shrink-0"
      >
        Details
      </button>
    </div>
  );
}