import React from 'react';
import type { SubjectData } from '../types';
import { cls } from '../utils';

interface SidebarProps {
  open: boolean;
  data: SubjectData[];
  activeGoalId: string | null;
  onSelectGoal: (id: string) => void;
  onOpenCreate: () => void;
  onToggle: () => void;
}

export function Sidebar({ open, data, activeGoalId, onSelectGoal, onOpenCreate, onToggle }: SidebarProps) {
  const totalGoals = data.reduce((acc, s) => acc + s.goals.length, 0);

  return (
    <aside className={cls("transition-all duration-300 bg-[#0e0e0e] overflow-y-auto flex-shrink-0", open ? "w-64" : "w-14")}>
      <div className={cls("py-3 relative", open ? "px-2" : "px-0 flex flex-col items-center")}>
        <div className={cls("flex items-center", open ? "justify-start mb-4" : "justify-center")}>
          {open ? (
             <button className="w-8 h-8 grid place-items-center rounded-lg border border-white/15 text-white/90 hover:bg-white/5" title="Create Goal" onClick={onOpenCreate} aria-label="Create Goal">+</button>
          ) : (
            <button className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/5 text-white/90" title="Create Goal" onClick={onOpenCreate} aria-label="Create Goal">+</button>
          )}
        </div>
        
        {open && (
          totalGoals === 0 ? (
            <div className="px-3 text-center text-white/60 text-sm">
                <p>Active goals will appear here.</p>
                <p className="mt-2">Click the '+' button above to create a new goal.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((s) => (
                <div key={s.subject}>
                  <div className="text-white/80 text-sm mb-1 px-2">{s.subject}</div>
                  <div className="space-y-1">
                    {s.goals.map((g) => {
                      const active = g.id === activeGoalId;
                      return (
                        <button key={g.id} className={cls("w-full text-left px-2 py-2 rounded-md hover:bg-white/5", active && "bg-white/5")} onClick={() => onSelectGoal(g.id)} title={`${g.name} · ${g.days}d`} aria-label={`Select goal: ${g.name}, ${g.days} days left`}>
                          <div className="text-white/90 text-sm truncate">{g.name}</div>
                          <div className="text-white/50 text-xs"><span className="text-red-400">{g.days}</span><span className="text-white/80">d</span> left</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </aside>
  );
}