import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { StudentProfileForm } from './StudentProfileForm';
import { getInitialProfile } from '../utils';
import { BrainIcon } from './BrainIcon';

interface ProfileSetupProps {
  onSave: (profile: UserProfile) => void;
  userEmail: string;
}

export function ProfileSetup({ onSave, userEmail }: ProfileSetupProps) {
  const [profileData, setProfileData] = useState<UserProfile>(() => {
      const initialProfile = getInitialProfile();
      initialProfile.general.email = userEmail;
      return initialProfile;
  });

  const handleSave = () => {
    // A simple validation check
    if (!profileData.general.name || !profileData.general.stage) {
        alert("Please fill in at least your Name and Stage before continuing.");
        return;
    }
    onSave(profileData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0b0b] flex flex-col items-center justify-center animate-[fade-in_0.3s_ease-out]">
        <div className="w-full max-w-4xl h-full flex flex-col text-white p-4">
             <header className="flex-shrink-0 py-6 text-center">
                <BrainIcon className="h-10 w-10 text-white mx-auto" />
                <h1 className="text-3xl font-bold text-white/90 mt-4">Welcome to Neura</h1>
                <p className="text-white/60 mt-2">Let's set up your student profile to personalize your learning experience.</p>
            </header>
            
            <main className="flex-1 overflow-y-auto p-6 bg-[#1e1e1e] rounded-2xl border border-white/10">
                <StudentProfileForm 
                    profile={profileData}
                    onProfileChange={setProfileData}
                />
            </main>

            <footer className="flex-shrink-0 p-4 mt-4 flex justify-end items-center gap-3">
                <button 
                    className="px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-200"
                    onClick={handleSave}
                >
                    Save & Continue
                </button>
            </footer>
        </div>
    </div>
  );
}
