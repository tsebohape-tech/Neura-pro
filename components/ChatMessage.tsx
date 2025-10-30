import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessageData } from '../types';
import { cls } from '../utils';
import { StrategyCard } from './StrategyCard';
import { ChatMarkdown } from './ChatMarkdown';
import { PlanUpdateProposalCard } from './PlanUpdateProposalCard';

interface ChatMessageProps extends ChatMessageData {
  isEditing: boolean;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, newContent: string) => void;
  onAcceptUpdate?: () => void;
  onDeclineUpdate?: () => void;
  isStreaming?: boolean;
}

// --- NEW ICONS ---

const ICON_CLASS = "h-5 w-5";

const CopyIcon = () => (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

const EditIcon = () => (
    <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
);


const UserMessageEditor: React.FC<{
    initialContent: string;
    onSave: (newContent: string) => void;
    onCancel: () => void;
}> = ({ initialContent, onSave, onCancel }) => {
    const [text, setText] = useState(initialContent);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            textareaRef.current.focus();
        }
    }, [text]);

    const handleSave = () => {
        if (text.trim() && text.trim() !== initialContent.trim()) {
            onSave(text.trim());
        } else {
            onCancel();
        }
    };

    return (
        <div className="w-full flex justify-end">
            <div className="w-full max-w-[85%]">
                <div className="bg-[#2f2f2f] rounded-2xl p-4 space-y-3">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
                        className="w-full bg-transparent text-lg leading-relaxed resize-none outline-none text-white"
                        rows={1}
                    />
                    <div className="flex justify-end items-center gap-2">
                        <button onClick={onCancel} className="px-4 py-1.5 text-sm rounded-lg bg-black text-white/90 hover:bg-black/70">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-lg bg-white text-black font-medium hover:bg-gray-200">
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ id, role, content, type, strategyState, strategy, sources, isEditing, onStartEdit, onCancelEdit, onSaveEdit, planUpdateProposal, onAcceptUpdate, onDeclineUpdate, isStreaming = false }) => {
  const isAssistant = role === "assistant";
  
  const [animatedContent, setAnimatedContent] = useState('');
  const animationIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  
  // Refs to hold the latest prop values without re-triggering the main effect.
  const contentRef = useRef(content);
  const isStreamingRef = useRef(isStreaming);

  // Effect to keep the refs synchronized with the latest props.
  useEffect(() => {
    contentRef.current = content;
    isStreamingRef.current = isStreaming;
  }, [content, isStreaming]);

  // This effect manages the animation's lifecycle. It only runs when the message ID
  // changes, setting up a single, robust animation loop that is not affected by
  // subsequent re-renders from new content chunks.
  useEffect(() => {
    // When a new message appears, clear any existing animation interval from a previous message.
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }
    // Reset the visible content for the new message.
    setAnimatedContent('');

    // Start the animation interval.
    animationIntervalRef.current = setInterval(() => {
      const fullContent = contentRef.current;
      const stillStreaming = isStreamingRef.current;
      
      // Update the animated content state based on the full content.
      setAnimatedContent(current => {
        // If the animation has caught up to the current full content...
        if (current.length >= fullContent.length) {
          // ...and the parent component indicates that the stream is finished...
          if (!stillStreaming) {
            // ...then we can stop this interval for good as there's no more work to do.
            if (animationIntervalRef.current) {
              clearInterval(animationIntervalRef.current);
              animationIntervalRef.current = null;
            }
          }
          // Return the content as is. The interval continues to poll in case more
          // text arrives while `stillStreaming` is true.
          return current;
        }
        
        // If there's more text to render, add the next character.
        return fullContent.substring(0, current.length + 1);
      });
    }, 25); // Typing speed in milliseconds.

    // Cleanup function: clear the interval on unmount or when the message ID changes again.
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [id]); // CRITICAL FIX: This effect ONLY depends on the message ID.
  
  // A final effect to snap to the complete content once streaming is finished.
  // This is a safety net that ensures the final text is always correct and rendered
  // immediately, even if the interval is slow to catch up.
  useEffect(() => {
      if (!isStreaming) {
          setAnimatedContent(content);
          // If the stream is done, we can be certain the interval is no longer needed.
          if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
          }
      }
  }, [isStreaming, content]);


  if (isAssistant && type === 'strategy' && strategyState) {
    return <StrategyCard state={strategyState} strategy={strategy} sources={sources} />;
  }
  
  if (isAssistant && type === 'plan_update_proposal' && planUpdateProposal) {
    return <PlanUpdateProposalCard proposal={planUpdateProposal} onAccept={onAcceptUpdate} onDecline={onDeclineUpdate} />;
  }

  if (isAssistant && type === 'image') {
    return (
        <div className="group flex justify-start">
            <div className="relative rounded-2xl bg-transparent p-0">
                <img src={content} alt="Generated by Neura" className="rounded-lg max-w-full h-auto" style={{ maxWidth: '400px' }}/>
                <a 
                    href={content} 
                    download={`neura-image-${id}.jpeg`}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-md bg-black/60 border border-white/10 text-white" 
                    title="Download Image"
                    aria-label="Download Image"
                >
                    <svg viewBox="0 0 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </a>
            </div>
        </div>
    );
  }

  // Handle standard text messages from the assistant
  if (isAssistant) {
    // A more reliable way to determine if the animation is complete
    const isAnimationComplete = !isStreaming && content.length > 0;
    const showThinkingIndicator = isStreaming && animatedContent.length === 0 && content.length === 0;

    return (
      <div className="group w-full flex flex-col items-start">
        <div className="text-lg leading-relaxed break-words text-white/90">
            {showThinkingIndicator && <div className="thinking-indicator"></div>}
            {animatedContent.length > 0 && <ChatMarkdown content={animatedContent} />}
        </div>
        {isAnimationComplete && (
          <div className="mt-2 flex items-center h-8 gap-1">
            <button
              className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Copy"
              onClick={() => navigator.clipboard?.writeText(content)}
              aria-label="Copy message content"
            >
              <CopyIcon />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Handle user messages
  if (isEditing) {
    return <UserMessageEditor initialContent={content} onSave={(newContent) => onSaveEdit(id, newContent)} onCancel={onCancelEdit} />;
  }

  return (
    <div className="group flex flex-col items-end">
      <div className={cls(
        "relative max-w-[85%] rounded-2xl px-4 py-3 text-lg leading-relaxed break-words", 
        "bg-white/10 text-white",
        "whitespace-pre-wrap"
        )}> 
        {content}
      </div>
      <div className="mt-1 flex items-center justify-end h-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Copy"
          onClick={() => navigator.clipboard?.writeText(content)}
          aria-label="Copy message content"
        >
          <CopyIcon />
        </button>
        <button
          className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Edit"
          onClick={() => onStartEdit(id)}
          aria-label="Edit this message"
        >
          <EditIcon />
        </button>
      </div>
    </div>
  );
}