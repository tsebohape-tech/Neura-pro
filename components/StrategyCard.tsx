import React, { useState, useRef, useEffect } from 'react';
import { StrategyState, StrategyResponse } from '../types';
import { cls } from '../utils';

// --- ICONS ---
const GoalIcon = () => (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2"></circle>
    </svg>
);

const MoreIcon = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/80" fill="currentColor">
        <circle cx="5" cy="12" r="2"></circle>
        <circle cx="12" cy="12" r="2"></circle>
        <circle cx="19" cy="12" r="2"></circle>
    </svg>
);

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

const ShareIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const generateMarkdownReport = (strategy: StrategyResponse): string => {
    let md = `# Learning Plan: ${strategy.subject}\n\n`;
    md += `## Goal: ${strategy.goal}\n\n`;
    md += `### Feasibility Assessment\n`;
    md += `- **Risk Level:** ${strategy.feasibility.risk}\n`;
    if (strategy.feasibility.recommendation) {
        md += `- **Recommendation:** ${strategy.feasibility.recommendation}\n`;
    }
    md += '\n';

    md += `### Strategy Overview\n`;
    md += `**Approach:** ${strategy.strategy_overview.approach}\n\n`;
    md += `**Reasoning:** ${strategy.strategy_overview.reasoning}\n\n`;

    md += '### Milestones\n';
    strategy.milestones.forEach(m => {
        md += `#### ${m.key}: ${m.title} (${m.duration_days} days)\n`;
        md += `- **Focus:** ${m.focus.join(', ')}\n`;
        md += `- **Methods:** ${m.methods.join(', ')}\n`;
        md += `- **Assessment:** ${m.assessment}\n\n`;
    });

    if (strategy.scientific_basis && strategy.scientific_basis.length > 0) {
        md += '### Scientific Basis (Sources)\n';
        strategy.scientific_basis.forEach(s => {
            md += `- **[${s.citation}](${s.uri})**: ${s.description}\n`;
        });
    }

    return md;
};

interface StrategyCardProps {
    state: StrategyState;
    strategy?: StrategyResponse;
    sources?: any[];
}

export function StrategyCard({ state, strategy }: StrategyCardProps) {
    const [isShareMenuOpen, setShareMenuOpen] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    const { currentStatus } = state;
    const isComplete = !!strategy;

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setShareMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleDownload = () => {
        if (!strategy) return;
        const markdown = generateMarkdownReport(strategy);
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeSubjectName = strategy.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `neurapro_plan_${safeSubjectName}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShareMenuOpen(false);
    };

    const handleShare = () => {
        if (!strategy) return;
        const planId = btoa(JSON.stringify({ s: strategy.subject, g: strategy.goal })).slice(0, 12);
        const shareableLink = `https://neurapro.ai/plan/${planId}`;
        navigator.clipboard.writeText(shareableLink).then(() => {
            setLinkCopied(true);
            setTimeout(() => {
                setLinkCopied(false);
                setShareMenuOpen(false);
            }, 2000);
        });
    };

    if (!isComplete) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[#1e1e1e]/50 p-4 max-w-[85%] w-full animate-[fade-in_0.3s_ease-out]">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <div>
                        <span className="text-sm font-medium text-white/90">Formulating Strategy...</span>
                        <p className="text-xs text-white/70 truncate pr-4">{currentStatus}</p>
                    </div>
                </div>
            </div>
        );
    }
    
    const { feasibility, strategy_overview, milestones, scientific_basis } = strategy;

    return (
        <div className="max-w-4xl w-full bg-black rounded-2xl border border-white/10 flex flex-col shadow-2xl animate-[fade-in_0.3s_ease-out] text-white">
            <header className="p-4 border-b border-white/10 flex-shrink-0 flex justify-between items-center gap-4">
                <div className="flex flex-1 items-center gap-3 overflow-hidden min-w-0">
                    <GoalIcon />
                    <span className="text-2xl font-bold text-white/90 truncate" title={strategy.goal}>{strategy.goal}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative" ref={shareMenuRef}>
                         <button
                            onClick={() => setShareMenuOpen(prev => !prev)}
                            className="flex items-center gap-2 px-5 py-2 text-sm rounded-full bg-black/40 border border-white/20 text-white/90 hover:bg-white/10 flex-shrink-0 transition-colors"
                            aria-label="Share and Export options"
                        >
                            <span>Share & Export</span>
                             <svg viewBox="0 0 20 20" className="h-4 w-4 text-white/70" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {isShareMenuOpen && (
                             <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-[#2f2f2f] border border-white/10 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-[fade-in_0.1s_ease-out] z-10">
                                <div className="py-1">
                                    <button onClick={handleShare} className="text-white/90 block w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-3">
                                        {linkCopied ? <CheckIcon /> : <ShareIcon />}
                                        {linkCopied ? 'Link Copied!' : 'Share Link'}
                                    </button>
                                    <button onClick={handleDownload} className="text-white/90 block w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center gap-3">
                                        <DownloadIcon /> Download Report
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="p-8 space-y-8 flex-1 overflow-y-auto max-h-[60vh]">
                <div>
                    <h1 className="text-3xl font-bold text-white/90 leading-tight">
                        Your Strategic Pathway
                    </h1>
                     <p className="text-lg text-white/70 leading-relaxed mt-4">
                        <strong>Approach: </strong> {strategy_overview.approach}
                    </p>
                    <p className="text-lg text-white/70 leading-relaxed mt-2">
                        <strong>Reasoning: </strong> {strategy_overview.reasoning}
                    </p>
                </div>
                
                <div className="space-y-6">
                    {milestones.map((milestone, index) => (
                        <div key={milestone.key} className="pt-4 border-t border-white/10">
                            <h2 className="text-2xl font-semibold text-white/90 mb-3">
                                Milestone {index + 1}: {milestone.title}
                            </h2>
                            <ul className="list-disc list-inside space-y-2 text-base text-white/70 leading-relaxed">
                                <li><strong>Duration:</strong> Approximately {milestone.duration_days} days</li>
                                <li><strong>Focus:</strong> <em>{milestone.focus.join(', ')}</em></li>
                                <li><strong>Methods:</strong> <em>{milestone.methods.join(', ')}</em></li>
                                <li><strong>Assessment:</strong> <em>{milestone.assessment}</em></li>
                            </ul>
                        </div>
                    ))}
                </div>

                {scientific_basis && scientific_basis.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                        <h2 className="text-2xl font-semibold text-white/90 mb-4">Scientific Basis</h2>
                        <div className="space-y-4">
                            {scientific_basis.map((source, i) => (
                                <div key={i} className="p-4 rounded-lg bg-black/30 border border-white/10">
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-base text-blue-300 hover:underline">
                                        {source.citation || "Untitled Source"}
                                    </a>
                                    <p className="text-base text-white/70 mt-1">{source.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}