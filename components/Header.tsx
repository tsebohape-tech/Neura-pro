
import React, { useState, useRef, useEffect } from 'react';
import { BrainIcon } from './BrainIcon';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenSettings: () => void;
  onLogout: () => void;
  userEmail: string | null;
  isLiveSessionActive: boolean;
}

export function Header({ onToggleSidebar, sidebarOpen, onOpenSettings, onLogout, userEmail, isLiveSessionActive }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  return (
    <div className="sticky top-0 z-30 px-4 h-14 flex items-center justify-between bg-[#0b0b0b] relative">
      <div className="flex items-center gap-3">
        <BrainIcon className="h-6 w-6 text-white" />
        {!sidebarOpen && (
          <button className="p-1 rounded-md hover:bg-white/5 text-white/80" aria-label="Toggle Sidebar" onClick={onToggleSidebar} title="Toggle sidebar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2.25" />
              <line x1="10" y1="3" x2="10" y2="21" />
            </svg>
          </button>
        )}
      </div>

      {sidebarOpen && (
        <button 
            className="absolute top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/5 text-white/80" 
            style={{ left: 'calc(16rem - 2.5rem)'}}
            aria-label="Toggle Sidebar" 
            onClick={onToggleSidebar} 
            title="Toggle sidebar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2.25" />
              <line x1="10" y1="3" x2="10" y2="21" />
            </svg>
        </button>
      )}

      <div className="flex items-center gap-2">
        {isLiveSessionActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 border border-red-500 text-white text-sm font-medium live-session-active" title="Live session is active">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span>LIVE</span>
          </div>
        )}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-white text-sm" aria-label="Share">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Share</span>
        </button>
         <div className="relative" ref={menuRef}>
            <button className="p-2 rounded-full hover:bg-gray-200 text-black w-8 h-8 flex items-center justify-center bg-white font-semibold" aria-label="User menu" title="User menu" onClick={() => setMenuOpen(!menuOpen)}>
                {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
            </button>
            {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-[#1e1e1e] border border-white/10 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-[fade-in_0.1s_ease-out] z-10">
                    <div className="py-1">
                        <div className="px-4 py-2 text-xs text-white/50 border-b border-white/10">
                            Signed in as <br/>
                            <span className="text-sm text-white/80 font-medium truncate block">{userEmail}</span>
                        </div>
                        <a href="#" onClick={(e) => { e.preventDefault(); onOpenSettings(); setMenuOpen(false); }} className="text-white/90 block px-4 py-2 text-sm hover:bg-white/5">Settings</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); setMenuOpen(false); }} className="text-red-400 block w-full text-left px-4 py-2 text-sm hover:bg-white/5">Sign out</a>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
