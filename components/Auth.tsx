import React, { useState } from 'react';
import { BrainIcon } from './BrainIcon';

interface AuthProps {
  onLogin: (email: string) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password.trim()) {
      onLogin(email);
    }
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-4 animate-[fade-in_0.3s_ease-out]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrainIcon className="h-12 w-12 text-white mx-auto" />
          <h1 className="text-3xl font-bold text-white/90 mt-4">Welcome to Neura</h1>
          <p className="text-white/60 mt-2">{isLogin ? 'Sign in to continue your journey.' : 'Create an account to get started.'}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[#111] border border-white/10 rounded-2xl p-8 space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-white"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-white"
              required
            />
          </div>
          <button type="submit" className="w-full px-5 py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p className="text-center text-white/50 text-sm mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-white/80 hover:underline ml-1">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}