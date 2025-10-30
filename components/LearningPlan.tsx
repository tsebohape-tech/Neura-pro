import React from 'react';
import type { Goal } from '../types';
import { cls } from '../utils';

interface LearningPlanProps {
  goal: Goal;
  onToggleStep: (milestoneKey: string, stepIndex: number) => void;
}

export function LearningPlan({ goal, onToggleStep }: LearningPlanProps) {
  // FIX: Flatten all steps to correctly calculate overall progress.
  const allSteps = goal.plan?.flatMap(milestone => milestone.steps) ?? [];
  const completedSteps = allSteps.filter(p => p.completed).length;
  const totalSteps = allSteps.length;
  const percent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  
  const pastel = {
    mint: "#B5F5D2",
    lavender: "#DAD0FF",
    peach: "#FFD5C2",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121212] p-4">
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-white/80">Learning Plan</span>
          <span className="text-xs text-white/60">{completedSteps} / {totalSteps} steps</span>
        </div>
        <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-2 rounded-full transition-all duration-300" style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${pastel.mint}, ${pastel.lavender}, ${pastel.peach})` }} />
        </div>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {/* FIX: Iterate over milestones and then their steps, which is the correct data structure. */}
        {goal.plan?.map((milestone) => (
          <div key={milestone.key}>
            <p className="text-xs text-white/50 font-semibold my-2">{milestone.title}</p>
            {milestone.steps.map((step, index) => (
              <label key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors" htmlFor={`step-${goal.id}-${milestone.key}-${index}`}>
                <input 
                  id={`step-${goal.id}-${milestone.key}-${index}`}
                  type="checkbox" 
                  checked={step.completed}
                  onChange={() => onToggleStep(milestone.key, index)}
                  className="h-4 w-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-indigo-500/50 accent-indigo-500 flex-shrink-0"
                />
                <span className={cls("text-sm transition-colors", step.completed ? "text-white/50 line-through" : "text-white/90")}>
                  {step.text}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}