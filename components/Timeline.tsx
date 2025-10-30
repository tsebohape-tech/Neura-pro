

import React from 'react';
import type { Milestone } from '../types';
import { cls } from '../utils';

// Icons for different states
const GoalStarIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-black">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);
const DoneCheckIcon = () => (
     <svg viewBox="0 0 24 24" className="h-4 w-4 text-black" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

// FIX: Define the TimelineProps interface to resolve the TypeScript error.
interface TimelineProps {
  milestones?: Milestone[];
}

export function Timeline({ milestones }: TimelineProps) {
  if (!milestones || milestones.length === 0) {
    return (
       <div className="rounded-2xl bg-[#121212] p-6 h-24 flex items-center">
        <div className="relative w-full">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/10 rounded-full" />
        </div>
      </div>
    );
  }

  const totalSegments = milestones.length > 1 ? milestones.length - 1 : 1;
  const activeIndex = milestones.findIndex(s => s.state === 'active');
  // FIX: Replaced findLastIndex with a reverse loop for broader JS compatibility.
  let lastDoneIndex = -1;
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (milestones[i].state === 'done') {
      lastDoneIndex = i;
      break;
    }
  }

  let completedSegments = 0;
  if (activeIndex !== -1) {
    completedSegments = activeIndex;
  } else if (lastDoneIndex !== -1) {
    completedSegments = lastDoneIndex + 1;
    // If all milestones before 'goal' are done, consider it 100%
    if (milestones[milestones.length - 1].state === 'goal' && lastDoneIndex === milestones.length - 2) {
        completedSegments = totalSegments;
    }
  } else if (milestones.every(m => m.state === 'done')) {
      completedSegments = totalSegments;
  }
  
  const progressPercent = (completedSegments / totalSegments) * 100;

  return (
    <div className="rounded-2xl bg-[#121212] py-6 px-2 md:px-4 relative overflow-hidden">
        <div className="relative flex items-center justify-between">
            {/* Background Line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10 transform -translate-y-1/2"></div>
            {/* Progress Line */}
            <div 
                className="absolute top-4 left-4 h-0.5 bg-gradient-to-r from-[#a855f7] to-[#ec4899] transform -translate-y-1/2"
                style={{ width: `calc(${progressPercent}% * (100% - 2rem) / 100%)` }}
            ></div>
            {milestones.map((milestone) => {
                const isActive = milestone.state === 'active';
                const isDone = milestone.state === 'done';
                const isGoal = milestone.state === 'goal';
                const isPending = milestone.state === 'pending';

                return (
                    <div key={milestone.key} className="relative z-10 flex flex-col items-center gap-2 text-center group w-8">
                        <div 
                            className={cls(
                                "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0",
                                isDone && "bg-white border-white",
                                isActive && "bg-[#6d28d9] border-[#a855f7] shadow-[0_0_12px_3px_rgba(168,85,247,0.5)]",
                                isGoal && "bg-amber-400 border-amber-400",
                                isPending && "bg-[#121212] border-white/30"
                            )}
                        >
                            {isDone && <DoneCheckIcon />}
                            {isGoal && <GoalStarIcon />}
                        </div>
                        <span className="text-xs text-white/60 font-medium">{milestone.key}</span>
                        
                        {/* Tooltip */}
                        <div className={cls(
                            "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs p-2 text-xs text-white bg-black/80 border border-white/10 rounded-md shadow-lg z-20",
                            "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        )}>
                            <p className="font-bold">{milestone.title}</p>
                            {milestone.deadline && <p className="text-white/70">Due: {milestone.deadline}</p>}
                            {milestone.duration_days && <p className="text-white/70">Est. Duration: {milestone.duration_days} days</p>}
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  )
}