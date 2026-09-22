import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { authenticateUser, UserAccount } from '../lib/authService';

interface LoginViewProps {
  onLoginSuccess: (account: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      try {
        const user = authenticateUser(username, password);
        setIsLoading(false);
        if (user) {
          onLoginSuccess(user);
        } else {
          setErrorMsg('Invalid username or password. Please verify credentials.');
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'An error occurred during authentication.');
      }
    }, 350);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden select-none bg-slate-50 flex flex-col md:flex-row items-stretch">
      
      {/* ── Background: Architectural Box-Box Grid across the entire viewport ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-60 pointer-events-none z-0" />

      {/* ── Single Unified Red Curve SVG on Left (Zero Seams / Zero Dividers) ── */}
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[48vw] min-w-[380px] max-w-[620px] pointer-events-none z-10">
        <svg
          className="h-full w-full"
          viewBox="0 0 500 1000"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="unifiedRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
          <path
            d="M 0,0 L 320,0 C 500,260 500,740 320,1000 L 0,1000 Z"
            fill="url(#unifiedRedGrad)"
          />
        </svg>

        {/* Decorative Diamond Accents inside the Red Area */}
        <div className="absolute top-10 right-28 opacity-60 pointer-events-none">
          <div className="relative w-14 h-12">
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-white/60 rotate-45 rounded-[3px]" />
            <div className="absolute top-2 left-5 w-8 h-8 border-2 border-white/60 rotate-45 rounded-[3px]" />
          </div>
        </div>
        <div className="absolute top-1/2 right-20 -translate-y-1/2 opacity-50 pointer-events-none">
          <div className="w-8 h-8 border-2 border-white/50 rotate-45 rounded-[3px]" />
        </div>
        <div className="absolute bottom-20 right-32 opacity-40 pointer-events-none">
          <div className="w-6 h-6 border-2 border-white/40 rotate-45 rounded-[2px]" />
        </div>
      </div>

      {/* Mobile Red Header Background with Bottom Curve */}
      <div className="md:hidden relative w-full bg-gradient-to-b from-red-600 to-red-700 text-white p-8 pb-14 z-10">
        <div className="absolute bottom-0 left-0 right-0 h-6 translate-y-full pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 1000 100" preserveAspectRatio="none" fill="none">
            <path d="M 0,0 C 250,85 750,85 1000,0 L 0,0 Z" fill="#b91c1c" />
          </svg>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white text-red-600 font-black text-xs tracking-tighter shadow-xl uppercase flex items-center justify-center ring-4 ring-white/30">
            BOOSHNAM
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Booshnam Associates
            </h1>
            <p className="text-xs text-red-100 font-medium mt-1">
              Enterprise Construction & Site Operations Software
            </p>
          </div>
        </div>
      </div>

      {/* ── Desktop Left Content: Logo + Booshnam Associates ONLY ── */}
      <div className="hidden md:flex relative z-20 w-[36vw] min-w-[300px] max-w-[460px] flex-col justify-center pl-10 lg:pl-16 pr-4 text-white">
        <div className="space-y-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-white text-red-600 font-black text-xs tracking-tighter shadow-2xl shadow-black/20 uppercase flex items-center justify-center ring-4 ring-white/30">
            BOOSHNAM
          </div>
          
          {/* Brand Name */}
          <div>
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Booshnam Associates
            </h1>
            <p className="text-sm text-red-100 font-medium mt-2">
              Enterprise Construction & Site Operations Software
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Content Area: Centered Login Box ── */}
      <div className="flex-1 relative z-20 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 min-h-[600px]">
        
        {/* Subtle red ambient glow behind the login box */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-500/10 blur-[110px] pointer-events-none" />

        {/* Login Box */}
        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/60 border border-slate-200/80 p-8 sm:p-10 space-y-6">
            
            {/* Header */}
            <div className="border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authorized Personnel Only</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sign in to your Staff Account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Access your assigned workspace modules and role permissions.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all bg-white"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3.5 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 font-medium mt-6">
            Powered by TogetherTech Groups 2026
          </p>
        </div>

      </div>

    </div>
  );
};
