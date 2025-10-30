import React from 'react';
import type { SubjectData, Goal } from '../types';
import { BrainIcon } from './BrainIcon';

interface DashboardProps {
  data: SubjectData[];
  onSelectGoal: (id: string) => void;
  onOpenCreate: () => void;
}

function GoalProgressBar({ goal }: { goal: Goal }) {
  // FIX: Milestones have a `state`, not a `completed` property. Progress is calculated by counting 'done' states.
  const completed = goal.plan?.filter(p => p.state === 'done').length ?? 0;
  // FIX: Use optional chaining and nullish coalescing to safely access goal.plan
  const total = goal.plan?.length ? (goal.plan.some(p => p.state === 'goal') ? goal.plan.length -1 : goal.plan.length) : 0;
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 mt-1">
      <div 
        className="bg-gradient-to-r from-green-400 to-blue-500 h-1.5 rounded-full transition-all duration-300" 
        style={{ width: `${percent}%` }}
      ></div>
    </div>
  );
}


export function Dashboard({ data, onSelectGoal, onOpenCreate }: DashboardProps) {
  const totalGoals = data.reduce((acc, s) => acc + s.goals.length, 0);

  if (totalGoals === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <BrainIcon className="h-16 w-16 text-white/20 mb-4" />
          <h2 className="text-2xl font-bold text-white/90">Welcome to NeuraLearn</h2>
          <p className="text-white/60 mt-2 max-w-md">
              Your personal AI tutor is ready to help you achieve your learning goals. Get started by creating your first goal.
          </p>
          <button 
              className="mt-6 px-5 py-2.5 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              onClick={onOpenCreate}
          >
              Create Your First Goal
          </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white/90 mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((subject) => (
          <div key={subject.subject} className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col">
            <h2 className="text-lg font-semibold text-white/80 mb-3">{subject.subject}</h2>
            <div className="space-y-2">
              {subject.goals.map((goal) => (
                <button 
                  key={goal.id} 
                  className="w-full text-left p-3 rounded-lg bg-[#0b0b0b] hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                  onClick={() => onSelectGoal(goal.id)}
                  aria-label={`Select goal: ${goal.name}`}
                >
                  <div className="flex justify-between items-start">
                      <span className="text-white/90 text-sm font-medium">{goal.name}</span>
                      <span className="text-xs text-red-400 flex-shrink-0 ml-2">{goal.days}d left</span>
                  </div>
                  <GoalProgressBar goal={goal} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}