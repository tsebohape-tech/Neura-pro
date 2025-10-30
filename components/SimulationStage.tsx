import React from 'react';
import { SimulationStageData } from '../types';
import { cls } from '../utils';

export const StageIcon = ({ stage }: { stage: string }) => {
    const iconClass = "h-5 w-5 text-white/60 flex-shrink-0";
    const icons: { [key: string]: React.ReactElement } = {
        calibration: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
        scope: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>,
        sources: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>,
        analysis: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
        validation: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
        structure: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
        synthesis: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
    };
    return icons[stage] || icons['calibration'];
};

// FIX: Extracted props to an interface to resolve incorrect type inference for the `key` prop.
interface SimulationStageDisplayProps {
    data: SimulationStageData;
}

export const SimulationStageDisplay: React.FC<SimulationStageDisplayProps> = ({ data }) => {
    return (
        <div className="flex items-start gap-3">
            <StageIcon stage={data.stage} />
            <div className="flex-1 min-w-0">
                <p className="text-white/90 font-medium capitalize">{data.stage.replace('_', ' ')}</p>
                <p className="text-white/70 mt-1 text-sm break-words">{data.narration}</p>
                {data.evidence && data.evidence.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {data.evidence.map((ev, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{ev}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}