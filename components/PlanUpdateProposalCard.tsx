import React from 'react';
import type { PlanUpdateProposal } from '../types';

const ChangeArrow = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/50 mx-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
);

const ChangeItem = ({ label, from, to }: { label: string, from: any, to: any }) => {
    if (!from || !to) return null;
    const fromText = Array.isArray(from) ? from.join(', ') : from.toString();
    const toText = Array.isArray(to) ? to.join(', ') : to.toString();

    return (
        <div className="flex items-center text-sm">
            <span className="font-semibold text-white/70 w-24 flex-shrink-0">{label}</span>
            <span className="px-2 py-1 rounded bg-black/40 text-white/80 truncate">{fromText}</span>
            <ChangeArrow />
            <span className="px-2 py-1 rounded bg-blue-900/50 text-blue-300 truncate">{toText}</span>
        </div>
    );
};


interface PlanUpdateProposalCardProps {
    proposal: PlanUpdateProposal;
    onAccept?: () => void;
    onDecline?: () => void;
}

export const PlanUpdateProposalCard: React.FC<PlanUpdateProposalCardProps> = ({ proposal, onAccept, onDecline }) => {
    const { reasoning, changes, milestoneKey } = proposal;
    const hasChanges = Object.keys(changes).length > 0;

    return (
        <div className="max-w-[85%] w-full bg-[#1C1C1C] rounded-2xl border border-blue-400/30 shadow-lg animate-[fade-in_0.2s_ease-out]">
            <header className="p-4 border-b border-white/10">
                <h3 className="font-semibold text-white/90">Neura Suggests an Update</h3>
                <p className="text-sm text-white/70 mt-1">Based on your progress, I recommend we adjust the plan for milestone **{milestoneKey}**.</p>
            </header>

            <div className="p-4 space-y-4">
                <div>
                    <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Reasoning</h4>
                    <p className="text-sm text-white/80 bg-black/30 p-3 rounded-lg">{reasoning}</p>
                </div>

                {hasChanges && (
                    <div>
                        <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Proposed Changes</h4>
                        <div className="space-y-2 bg-black/30 p-3 rounded-lg">
                            <ChangeItem label="Duration" from={changes.duration_days?.from + ' days'} to={changes.duration_days?.to + ' days'} />
                            <ChangeItem label="Focus" from={changes.focus?.from} to={changes.focus?.to} />
                            <ChangeItem label="Methods" from={changes.methods?.from} to={changes.methods?.to} />
                            <ChangeItem label="Assessment" from={changes.assessment?.from} to={changes.assessment?.to} />
                        </div>
                    </div>
                )}
            </div>

            <footer className="p-3 bg-black/30 flex items-center justify-end gap-3">
                <button 
                    onClick={onDecline}
                    className="px-4 py-1.5 text-sm rounded-lg border border-white/15 text-white/80 hover:bg-white/5"
                >
                    Decline
                </button>
                 <button 
                    onClick={onAccept}
                    className="px-4 py-1.5 text-sm rounded-lg bg-white text-black font-medium hover:bg-gray-200"
                >
                    Accept & Update Plan
                </button>
            </footer>
        </div>
    );
};
