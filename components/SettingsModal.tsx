import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { StudentProfileForm } from './StudentProfileForm';
import { cls } from '../utils';

interface SettingsModalProps {
  onCancel: () => void;
  onSave: (profile: UserProfile) => void;
  initialProfile: UserProfile;
}

type ActiveTab = 'profile' | 'wellbeing' | 'billing';

export function SettingsModal({ onCancel, onSave, initialProfile }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [profileData, setProfileData] = useState<UserProfile>(initialProfile);

  const handleSave = () => {
    // Here you could add validation before saving
    onSave(profileData);
  };
  
  // FIX: Made `children` optional to align with similar fixes in the codebase and resolve a TypeScript error.
  const TabButton = ({ tabId, children }: { tabId: ActiveTab, children?: React.ReactNode }) => (
      <button 
        onClick={() => setActiveTab(tabId)}
        className={cls(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors text-left",
            activeTab === tabId ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
        )}
        aria-current={activeTab === tabId}
      >
          {children}
      </button>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div 
        className="w-full max-w-4xl h-[90vh] rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-2xl flex flex-col text-white" 
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button className="p-1.5 rounded-full hover:bg-white/10" onClick={onCancel} aria-label="Close">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
            </button>
        </header>
        <div className="flex flex-1 overflow-hidden">
            <nav className="w-56 flex-shrink-0 border-r border-white/10 p-4">
                <div className="space-y-2 flex flex-col items-stretch">
                    <TabButton tabId="profile">Profile</TabButton>
                    <TabButton tabId="wellbeing">Wellbeing &amp; Control Center</TabButton>
                    <TabButton tabId="billing">Billing &amp; Subscription</TabButton>
                </div>
            </nav>
            <main className="flex-1 overflow-y-auto p-6">
                {activeTab === 'profile' && (
                    <StudentProfileForm 
                        profile={profileData}
                        onProfileChange={setProfileData}
                    />
                )}
                {activeTab === 'wellbeing' && (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Wellbeing &amp; Control Center</h3>
                        <p className="text-white/70">This section is under development. Soon, you'll be able to manage your study breaks, focus modes, and more.</p>
                    </div>
                )}
                 {activeTab === 'billing' && (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Billing &amp; Subscription</h3>
                        <p className="text-white/70">This section is under development. Soon, you'll be able to manage your subscription plan and view billing history.</p>
                    </div>
                )}
            </main>
        </div>
        <footer className="flex-shrink-0 p-4 border-t border-white/10 flex justify-end items-center gap-3">
            <button className="px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5" onClick={onCancel}>
                Cancel
            </button>
            <button 
                className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200"
                onClick={handleSave}
            >
                Save Profile
            </button>
        </footer>
      </div>
    </div>
  );
}