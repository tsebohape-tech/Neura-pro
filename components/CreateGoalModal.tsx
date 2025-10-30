import React, { useState, useRef, useEffect } from 'react';
import type { GoalFormPayload, ClassifiedResource, ResourceSourceType, ResourceAuthority, UserProfile, AIFoundResource } from '../types';
import { cls } from '../utils';
import { findRelevantResources } from '../services/geminiService';

interface CreateGoalModalProps {
  onCancel: () => void;
  onCreate: (payload: GoalFormPayload) => void;
  userProfile: UserProfile;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const LinkIcon = () => (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/80 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/></svg>
);

const FileIcon = ({ type }: { type: string }) => {
    const iconClass = "h-6 w-6 text-white/80 flex-shrink-0";
    if (type.includes('pdf')) return <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M5 12V4a2 2 0 0 1 2-2h7l5 5v4"/><path d="M2 18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M14 15V9"/><path d="M11 12h3"/><path d="m11 15 3-3-3-3"/></svg>;
    if (type.includes('word')) return <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><path d="M14 2v6h6"/><path d="M2 15h8"/><path d="M6 15v7"/></svg>;
    return <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
};

// This is a client-side simulation of the AI resource classifier
const simulateFileClassification = (file: File): ClassifiedResource => {
    const name = file.name.toLowerCase();
    let source_type: ResourceSourceType = 'unknown';
    let authority: ResourceAuthority = 'unknown';
    let title = file.name;

    if (name.includes('syllabus')) { source_type = 'syllabus'; authority = 'official'; title = "Official Syllabus"; }
    else if (name.includes('paper') || name.match(/p[1-4]/)) { source_type = 'past_paper'; authority = 'official'; title = "Past Paper"; }
    else if (name.includes('examiner') && name.includes('report')) { source_type = 'examiner_report'; authority = 'official'; title = "Examiner Report"; }
    else if (name.includes('mark') && name.includes('scheme')) { source_type = 'marking_scheme'; authority = 'official'; title = "Marking Scheme"; }
    else if (name.includes('textbook')) { source_type = 'textbook'; authority = 'publisher_textbook'; title = "Textbook Chapter"; }
    else if (name.includes('notes')) { source_type = 'notes'; authority = 'student_notes'; title = "Study Notes"; }

    const yearMatch = name.match(/(20)\d{2}/);

    return {
        id: `res-${Date.now()}-${Math.random()}`,
        source_type,
        title_detected: title,
        metadata: {
            year: yearMatch ? parseInt(yearMatch[0], 10) : undefined,
            fileType: file.type.includes('pdf') ? 'PDF' : 'DOCX',
        },
        authority,
        file: file,
    };
};

export function CreateGoalModal({ onCancel, onCreate, userProfile }: CreateGoalModalProps) {
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState(1.5);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [resources, setResources] = useState<ClassifiedResource[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [feasibilityNudge, setFeasibilityNudge] = useState<string | null>(null);
  
  const [aiResources, setAiResources] = useState<AIFoundResource[]>([]);
  const [isFindingResources, setIsFindingResources] = useState(false);
  const [finderSearched, setFinderSearched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deadline) {
      setFeasibilityNudge(null);
      return;
    }
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const totalHours = hours * (daysPerWeek / 7) * days;
    const estimatedHours = 50 + (resources.length * 10); // Base 50h for a topic + 10h per resource

    if (totalHours < estimatedHours * 0.8) {
      setFeasibilityNudge(`At ${hours}h/day, this looks tight. Consider increasing your daily time or extending the deadline.`);
    } else if (totalHours < estimatedHours) {
        setFeasibilityNudge(`This looks achievable, but it will be a challenging pace.`);
    } else {
      setFeasibilityNudge(null);
    }

  }, [deadline, hours, daysPerWeek, resources]);

  const handleFindResources = async () => {
    if (!subject.trim() || !goal.trim()) {
        alert("Please enter a Subject and Goal before searching for resources.");
        return;
    }
    setIsFindingResources(true);
    setFinderSearched(true);
    setAiResources([]);
    try {
        const found = await findRelevantResources(goal, subject, userProfile);
        setAiResources(found);
    } catch (error) {
        console.error("Failed to find AI resources:", error);
    } finally {
        setIsFindingResources(false);
    }
  };

  const addAiResource = (resource: AIFoundResource) => {
    const newResource: ClassifiedResource = {
        id: `res-ai-${Date.now()}-${Math.random()}`,
        source_type: 'unknown',
        title_detected: resource.title,
        metadata: {
            uri: resource.uri,
            fileType: 'URL',
        },
        authority: 'official',
    };
    if (!resources.some(r => r.metadata.uri === newResource.metadata.uri)) {
        setResources(prev => [...prev, newResource]);
    }
    setAiResources(prev => prev.filter(r => r.uri !== resource.uri));
  };


  const handleFiles = (files: FileList | null) => {
    if (files) {
      const newResources = Array.from(files).map(simulateFileClassification);
      const updatedResources = [...resources, ...newResources];
      setResources(updatedResources);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeResource = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
  };

  const handleCreate = () => {
    const payloadResources = resources.map(({ file, ...rest }) => rest);
    
    const payload: GoalFormPayload = {
      subject: subject.trim(),
      subject_focus: [],
      goal_text: goal.trim(),
      deadline_iso: deadline,
      hours_per_day: hours,
      days_per_week: daysPerWeek,
      resources: payloadResources,
      suggestions: [],
      feasibility: {
        nudge: feasibilityNudge || undefined
      }
    };
    onCreate(payload);
  };

  const isFormValid = subject.trim() && goal.trim() && deadline;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 animate-[fade-in_0.2s_ease-out]">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111] shadow-2xl flex flex-col">
        <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white/90">Create a Goal</h2>
          <button className="p-1.5 rounded-full hover:bg-white/5" onClick={onCancel} aria-label="Close">✕</button>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-white/70 mb-1 text-sm">Subject / Module</div>
              <input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="e.g., Chemistry" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white placeholder:text-white/40" />
              <p className="text-xs text-white/50 mt-1">Example: Chemistry (IGCSE 0620) or Math Paper 4.</p>
            </label>
             <label className="block">
              <div className="text-white/70 mb-1 text-sm">Goal</div>
              <input value={goal} onChange={(e)=>setGoal(e.target.value)} placeholder="e.g., Get an A in Chemistry" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white placeholder:text-white/40" />
              <p className="text-xs text-white/50 mt-1">Examples: "Score 90% in Paper 4", "Master Organic Chemistry".</p>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <label className="block">
              <div className="text-white/70 mb-1 text-sm">Deadline</div>
              <input type="date" min={getTodayString()} value={deadline} onChange={(e)=>setDeadline(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 outline-none text-white" />
              <p className="text-xs text-white/50 mt-1">Pick your exam date or target deadline.</p>
            </label>
            <div>
              <div className="text-white/70 mb-1 text-sm flex justify-between">
                <span>Daily Time Availability</span>
                <span className="font-medium text-white/90">{hours}h / day</span>
              </div>
              <input type="range" min={0.5} max={6} step={0.5} value={hours} onChange={(e)=>setHours(Number(e.target.value))} className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              <p className="text-xs text-white/50 mt-1">Used to plan realistic pacing.</p>
            </div>
          </div>
          <div>
            <div className="text-white/70 mb-1 text-sm">Resources</div>
            <div 
                className={cls("relative border-2 border-dashed border-white/20 rounded-xl p-6 text-center transition-colors", isDragging && "bg-blue-500/10 border-blue-400")}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="text-white/70">Upload files / Paste URL or text</div>
                <p className="text-xs text-white/50 mt-1">Drag & drop syllabus, past papers, notes, etc.</p>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 text-sm px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/90"
                >
                    Or select files
                </button>
                <input ref={fileInputRef} type="file" onChange={(e) => handleFiles(e.target.files)} className="hidden" multiple />
            </div>
            {resources.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {resources.map(r => {
                      const isUrlResource = !!r.metadata.uri;
                      return (
                        <div key={r.id} className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-start gap-3">
                            {isUrlResource ? <LinkIcon /> : <FileIcon type={r.file?.type || ""} />}
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm text-white/90 truncate">{isUrlResource ? r.title_detected : r.file?.name}</p>
                                {isUrlResource ? (
                                    <a href={r.metadata.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:underline truncate block">{r.metadata.uri}</a>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{r.source_type}</span>
                                      {r.metadata.year && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">{r.metadata.year}</span>}
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">{r.authority}</span>
                                  </div>
                                )}
                            </div>
                            <button onClick={() => removeResource(r.id)} className="p-1 rounded-full hover:bg-white/10 text-white/60 flex-shrink-0" aria-label="Remove resource">✕</button>
                        </div>
                      )
                    })}
                </div>
            )}
          </div>
          <div>
              <div className="text-white/70 mb-2 text-sm flex items-center justify-between">
                <span>AI Resource Finder</span>
                <button 
                  onClick={handleFindResources} 
                  disabled={isFindingResources || !subject.trim() || !goal.trim()}
                  className="text-xs px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFindingResources ? 'Searching...' : 'Find Resources'}
                </button>
              </div>
              <div className="space-y-2 p-3 bg-black/40 border border-white/10 rounded-lg min-h-[80px] flex flex-col justify-center">
                {isFindingResources && <div className="text-center text-sm text-white/60">Searching for relevant materials...</div>}
                
                {!isFindingResources && finderSearched && aiResources.length === 0 && (
                  <div className="text-center text-sm text-white/60">No additional resources found. You can still add your own above.</div>
                )}

                {!isFindingResources && aiResources.length > 0 && (
                  <div className="space-y-2">
                    {aiResources.map((res, i) => (
                      <div key={i} className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-start justify-between gap-3 animate-[fade-in_0.2s_ease-out]">
                        <div className="flex-1">
                            <a href={res.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-300 hover:underline">{res.title}</a>
                            <p className="text-xs text-white/60 mt-1">{res.description}</p>
                        </div>
                        <button onClick={() => addAiResource(res)} className="px-3 py-1 text-xs rounded-md bg-white/10 hover:bg-white/20 text-white flex-shrink-0">Add</button>
                      </div>
                    ))}
                  </div>
                )}

                {!isFindingResources && !finderSearched && (
                    <div className="text-center text-sm text-white/60">Enter a subject and goal, then click "Find Resources" to search the web.</div>
                )}
              </div>
          </div>
          {feasibilityNudge && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center text-sm text-yellow-300">
                  {feasibilityNudge}
              </div>
          )}
        </main>
        
        <footer className="flex-shrink-0 p-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5" onClick={onCancel}>Cancel</button>
          <button 
            className="px-5 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed" 
            disabled={!isFormValid} 
            onClick={handleCreate}
          >
            Generate Strategy
          </button>
        </footer>
      </div>
    </div>
  );
}