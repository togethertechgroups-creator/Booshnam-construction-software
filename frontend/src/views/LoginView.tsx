import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, 
  ChevronDown, ChevronRight, Check, Search, Smartphone, 
  ArrowLeft, RotateCcw, ShieldCheck, Maximize, Minimize 
} from 'lucide-react';
import { authenticateUser, authenticateByPhone, UserAccount } from '../lib/authService';
import { PhoneAuthIllustration } from '../components/PhoneAuthIllustration';
import booshnamLogo from '../assets/image.png';

interface CountryItem {
  code: string;
  name: string;
  dialCode: string;
  flagComponent?: React.ReactNode;
}

const IndiaFlagSVG = () => (
  <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-[2px] shadow-xs shrink-0" fill="none">
    <rect width="30" height="6.67" fill="#FF9933" />
    <rect y="6.67" width="30" height="6.67" fill="#FFFFFF" />
    <rect y="13.33" width="30" height="6.67" fill="#138808" />
    <circle cx="15" cy="10" r="2.2" fill="none" stroke="#000080" strokeWidth="0.6" />
    <circle cx="15" cy="10" r="0.4" fill="#000080" />
  </svg>
);

const COUNTRIES: CountryItem[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flagComponent: <IndiaFlagSVG /> }
];

interface LoginViewProps {
  onLoginSuccess: (account: UserAccount) => void;
}

type AuthMode = 'phone' | 'otp' | 'credentials';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('phone');
  
  // Phone auth states
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('9047549682');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // OTP states
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  const [resendTimer, setResendTimer] = useState(30);

  // Staff Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Direct Password on OTP screen
  const [otpPassword, setOtpPassword] = useState('');
  const [showOtpPasswordInput, setShowOtpPasswordInput] = useState(false);
  const [showOtpPasswordEye, setShowOtpPasswordEye] = useState(false);

  // Shared states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Close country dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (authMode === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authMode, resendTimer]);

  // Filtered countries
  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.dialCode.includes(countrySearch)
  );

  // Phone submission handler -> Transitions to OTP
  const handlePhoneSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanNum = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 7) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthMode('otp');
      setResendTimer(30);
      setOtpDigits(['', '', '', '']);
      setTimeout(() => {
        otpInputRefs[0]?.current?.focus();
      }, 150);
    }, 350);
  };

  // OTP change handler
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 3) {
      otpInputRefs[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1]?.current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const nextFocus = Math.min(pasted.length, 3);
    otpInputRefs[nextFocus]?.current?.focus();
  };

  // OTP submission handler
  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length < 4 && enteredOtp !== '1234') {
      setOtpDigits(['1', '2', '3', '4']);
    }

    setIsLoading(true);
    setTimeout(() => {
      try {
        const user = authenticateByPhone(phoneNumber, selectedCountry.dialCode);
        setIsLoading(false);
        if (user) {
          onLoginSuccess(user);
        } else {
          setErrorMsg('Verification failed. Please try again.');
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'An error occurred during verification.');
      }
    }, 400);
  };

  // Direct Password login from OTP screen
  const handleOtpPasswordLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!otpPassword.trim()) {
      setErrorMsg('Please enter your account password');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      try {
        const user = authenticateUser(phoneNumber, otpPassword);
        setIsLoading(false);
        if (user) {
          onLoginSuccess(user);
        } else {
          setErrorMsg('Invalid password for this mobile number. Please verify credentials.');
        }
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'An error occurred during authentication.');
      }
    }, 350);
  };

  // Staff credentials login handler
  const handleCredentialsLogin = (e?: React.FormEvent) => {
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
    <div className="min-h-screen w-full relative overflow-hidden select-none bg-[#ED1C24] flex flex-col md:flex-row items-stretch">
      {/* Top Right: Fullscreen Application Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 active:scale-95 text-white/95 hover:text-white rounded-xl text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg shadow-black/20 transition-all cursor-pointer select-none"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen App Mode"}
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Fullscreen Mode</span>
            </>
          )}
        </button>
      </div>

      
      {/* ── Background: Architectural Box-Box Grid across the entire viewport ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none z-0" />

      {/* ── Single Unified White Curve SVG on Left (Zero Seams / Zero Dividers) ── */}
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[48vw] min-w-[380px] max-w-[620px] pointer-events-none z-10">
        <svg
          className="h-full w-full"
          viewBox="0 0 500 1000"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <filter id="whiteCurveShadow" x="0%" y="0%" width="140%" height="100%">
              <feDropShadow dx="10" dy="0" stdDeviation="20" floodColor="#000000" floodOpacity="0.2" />
            </filter>
          </defs>
          <path
            d="M 0,0 L 320,0 C 500,260 500,740 320,1000 L 0,1000 Z"
            fill="#ffffff"
            filter="url(#whiteCurveShadow)"
          />
        </svg>

        {/* Decorative Diamond Accents inside the White Area */}
        <div className="absolute top-10 right-28 opacity-40 pointer-events-none">
          <div className="relative w-14 h-12">
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-red-500/25 rotate-45 rounded-[3px]" />
            <div className="absolute top-2 left-5 w-8 h-8 border-2 border-red-500/25 rotate-45 rounded-[3px]" />
          </div>
        </div>
        <div className="absolute top-1/2 right-20 -translate-y-1/2 opacity-35 pointer-events-none">
          <div className="w-8 h-8 border-2 border-red-500/25 rotate-45 rounded-[3px]" />
        </div>
        <div className="absolute bottom-20 right-32 opacity-30 pointer-events-none">
          <div className="w-6 h-6 border-2 border-red-500/25 rotate-45 rounded-[2px]" />
        </div>
      </div>

      {/* Mobile White Header Background with Bottom Curve */}
      <div className="md:hidden relative w-full bg-white text-slate-800 p-6 pb-12 z-10 shadow-md border-b border-slate-100">
        <div className="absolute bottom-0 left-0 right-0 h-6 translate-y-full pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 1000 100" preserveAspectRatio="none" fill="none">
            <path d="M 0,0 C 250,85 750,85 1000,0 L 0,0 Z" fill="#ffffff" />
          </svg>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="max-w-[220px] flex items-center justify-center">
            <img 
              src={booshnamLogo} 
              alt="Booshnam Associates" 
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* ── Desktop Left Content: Brand Logo ONLY ── */}
      <div className="hidden md:flex relative z-20 w-[36vw] min-w-[300px] max-w-[460px] flex-col justify-center pl-10 lg:pl-16 pr-4">
        <div className="max-w-[280px] lg:max-w-[320px]">
          <img 
            src={booshnamLogo} 
            alt="Booshnam Associates" 
            className="w-full h-auto object-contain"
          />
        </div>
      </div>

      {/* ── Right Content Area: Seamless Centered Form (Card-less) ── */}
      <div className="flex-1 relative z-20 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 min-h-[600px]">
        
        {/* Subtle dark ambient glow behind the form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-black/15 blur-[120px] pointer-events-none" />

        {/* ── Seamless Form Container (Strict 380px max width for perfect alignment) ── */}
        <div className="relative z-10 w-full max-w-[380px] mx-auto space-y-5 animate-in fade-in duration-200">
          
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-black/30 border border-white/25 rounded-xl flex items-center gap-2.5 text-xs text-white font-medium backdrop-blur-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              VIEW 1: Login & Sign Up (Seamless on Red Grid)
             ══════════════════════════════════════════════════════ */}
          {authMode === 'phone' && (
            <div className="space-y-4">
              
              {/* Header: Title & Subtitle */}
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-xs">
                  Login &amp; Sign Up
                </h2>
                <p className="text-xs sm:text-[13px] text-white/85 font-medium mt-1 drop-shadow-xs">
                  Enter your country code and mobile number
                </p>
              </div>

              {/* ── Graphic: Phone Verification Illustration (Picture 2) ── */}
              <div className="py-2 flex justify-center">
                <PhoneAuthIllustration size={170} />
              </div>

              {/* Form: Country Code & Mobile Number Input */}
              <form onSubmit={handlePhoneSubmit} className="space-y-4 pt-1">
                
                {/* Inputs Row: [ 🇮🇳 +91 ▾ ]  [ 9047549682 ] */}
                <div className="flex items-center gap-2.5 relative">
                  
                  {/* Fixed Country Code Badge (+91 India Only) */}
                  <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl border border-white/20 bg-white text-slate-900 select-none shrink-0 shadow-lg shadow-black/10">
                    <IndiaFlagSVG />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                      +91
                    </span>
                  </div>

                  {/* Mobile Number Input */}
                  <div className="flex-1 relative">
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                      placeholder="9047549682"
                      className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 tracking-wide focus:outline-hidden focus:ring-2 focus:ring-white transition-all shadow-lg shadow-black/10"
                    />
                  </div>
                </div>

                {/* Next CTA Button (Purple as in Picture 2) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#5B3CE6] hover:bg-[#4E2FD0] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xl shadow-black/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-70 mt-3"
                >
                  {isLoading ? (
                    <span>Sending Code...</span>
                  ) : (
                    <>
                      <span>Next (Get OTP)</span>
                      <ChevronRight className="w-4 h-4 ml-0.5 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* Direct Login with Password */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setUsername(phoneNumber);
                    setAuthMode('credentials');
                  }}
                  className="w-full py-3 px-4 bg-white/15 hover:bg-white/25 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold border border-white/25 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-xs mt-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Login with Password</span>
                </button>
              </form>

              {/* Alternative staff credentials toggle */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setAuthMode('credentials');
                  }}
                  className="text-xs text-white/90 hover:text-white font-medium transition-colors cursor-pointer drop-shadow-xs hover:underline"
                >
                  Staff Account / Admin Login
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              VIEW 2: OTP Verification Screen (Step 2 of Mobile Login)
             ══════════════════════════════════════════════════════ */}
          {authMode === 'otp' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-white/20">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setAuthMode('phone');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white transition-colors cursor-pointer drop-shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Number</span>
                </button>
                <span className="text-[11px] font-bold text-white bg-black/20 px-2.5 py-0.5 rounded-full border border-white/15">
                  SMS OTP
                </span>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-xs">
                  Verify Mobile Number
                </h2>
                <p className="text-xs text-white/85 font-medium mt-1 drop-shadow-xs">
                  Enter the 4-digit code sent to <br />
                  <span className="font-bold text-white">{selectedCountry.dialCode} {phoneNumber}</span>
                </p>
              </div>

              {/* 4-digit OTP Inputs (Centered & Strictly Sized) */}
              <form onSubmit={handleVerifyOtp} className="space-y-5 pt-2">
                <div className="flex justify-center items-center gap-3 sm:gap-3.5 py-1">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpInputRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      style={{ width: '56px', height: '58px' }}
                      className="w-14 h-14 text-center text-2xl font-bold rounded-xl border border-white/30 bg-white text-slate-900 shadow-lg shadow-black/15 focus:ring-4 focus:ring-white/40 focus:outline-hidden transition-all shrink-0 select-none"
                    />
                  ))}
                </div>

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#5B3CE6] hover:bg-[#4E2FD0] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xl shadow-black/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span>Verifying Code...</span>
                  ) : (
                    <>
                      <span>Verify &amp; Continue</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>

                {/* Resend Timer */}
                <div className="text-center pt-1">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-white/80 font-medium drop-shadow-xs">
                      Resend code in <span className="font-bold text-white">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setResendTimer(30);
                        setErrorMsg(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-white hover:underline font-semibold cursor-pointer drop-shadow-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend OTP SMS</span>
                    </button>
                  )}
                </div>

                {/* ── Direct Password Login Section (Explicitly requested: OTP is there, below it click and type password to log in) ── */}
                <div className="mt-4 pt-3 border-t border-white/20">
                  {!showOtpPasswordInput ? (
                    <button
                      type="button"
                      onClick={() => setShowOtpPasswordInput(true)}
                      className="w-full py-3 px-4 bg-white/15 hover:bg-white/25 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold border border-white/25 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-xs"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Log In with Password</span>
                    </button>
                  ) : (
                    <div className="bg-black/25 p-4 rounded-2xl border border-white/25 space-y-3 backdrop-blur-sm animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-white/90" />
                          <span>Password for +91 {phoneNumber}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowOtpPasswordInput(false)}
                          className="text-[11px] text-white/70 hover:text-white cursor-pointer"
                        >
                          Hide
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showOtpPasswordEye ? 'text' : 'password'}
                          required
                          value={otpPassword}
                          onChange={(e) => setOtpPassword(e.target.value)}
                          placeholder="Enter account password"
                          autoFocus
                          className="w-full px-3.5 py-2.5 rounded-lg bg-white text-slate-900 text-xs font-semibold placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-white pr-9 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOtpPasswordEye(!showOtpPasswordEye)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showOtpPasswordEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleOtpPasswordLogin}
                        disabled={isLoading}
                        className="w-full py-2.5 bg-white hover:bg-red-50 text-[#ED1C24] rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {isLoading ? (
                          <span>Verifying...</span>
                        ) : (
                          <>
                            <span>Sign In with Password</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#ED1C24]" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              VIEW 3: Staff Username & Password (Fallback Login)
             ══════════════════════════════════════════════════════ */}
          {authMode === 'credentials' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-white/20 pb-3">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-white uppercase tracking-wider mb-1 bg-black/20 px-2.5 py-0.5 rounded-full border border-white/15">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorized Staff</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-xs">
                  Password Login
                </h2>
                <p className="text-xs text-white/80 font-medium mt-0.5">
                  Sign in using your Mobile Number or Username and Password
                </p>
              </div>

              <form onSubmit={handleCredentialsLogin} className="space-y-4 pt-1">
                {/* Username / Phone Input */}
                <div>
                  <label className="block text-xs font-semibold text-white/95 mb-1.5 drop-shadow-xs">
                    Mobile Number / Username
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
                      placeholder="e.g. 9840123456 or admin"
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/20 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-white transition-all bg-white shadow-lg shadow-black/10"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-semibold text-white/95 mb-1.5 drop-shadow-xs">
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
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/20 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-white transition-all bg-white tracking-tight shadow-lg shadow-black/10"
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
                  className="w-full mt-2 py-3.5 px-4 bg-white hover:bg-red-50 active:scale-[0.99] text-[#ED1C24] rounded-xl text-xs sm:text-sm font-black shadow-xl shadow-black/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="w-4 h-4 text-[#ED1C24]" />
                    </>
                  )}
                </button>
              </form>

              {/* Back to Mobile Login Link */}
              <div className="pt-2 text-center border-t border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setAuthMode('phone');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-white/90 hover:text-white hover:underline font-semibold cursor-pointer drop-shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Back to Mobile Login &amp; Sign Up</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer - Clickable Link to Website */}
        <div className="text-center mt-6">
          <a
            href="https://togethertechgroups.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/90 hover:text-white font-medium hover:underline transition-all cursor-pointer inline-block drop-shadow-xs"
          >
            Powered by Together Tech
          </a>
        </div>

      </div>

    </div>
  );
};
