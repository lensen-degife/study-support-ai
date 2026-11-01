import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const { login, register, authError, clearError } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);

  // Validation & UI State
  const [clientError, setClientError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validatePasswordRules = (pwd) => {
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      digitOrSymbol: /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd),
    };
  };

  const pwdChecks = validatePasswordRules(password);
  const isPwdComplex = pwdChecks.length && pwdChecks.upper && pwdChecks.lower && pwdChecks.digitOrSymbol;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError('');
    clearError();

    // Client-side validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setClientError('Please enter a valid email address.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setClientError('Please provide your full name.');
        return;
      }
      if (!isPwdComplex) {
        setClientError('Password does not meet complexity requirements (min 8 chars, 1 uppercase, 1 lowercase, 1 number/symbol).');
        return;
      }
      if (password !== confirmPassword) {
        setClientError('Passwords do not match.');
        return;
      }
    } else {
      if (!password) {
        setClientError('Please enter your password.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });
      }
      if (onAuthSuccess) onAuthSuccess();
      if (onClose) onClose();
    } catch (err) {
      // Backend error is set in authError or err.message
      setClientError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoRole) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword('Password123!');
    setClientError('');
    clearError();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[92dvh] flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0">
              🎓
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-sm font-extrabold tracking-wide text-white">
                STUDY SUPPORT PLATFORM
              </h2>
              <p className="text-[11px] text-indigo-400 font-medium">
                {mode === 'login' ? 'Sign in to access your resources' : 'Create your academic profile'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-lg transition focus:outline-none"
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1.5 mx-4 sm:mx-6 mt-4 bg-slate-800/80 rounded-xl border border-slate-700/50 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setClientError('');
              clearError();
            }}
            className={`py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setClientError('');
              clearError();
            }}
            className={`py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {(clientError || authError) && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2 shrink-0">
            <span className="text-sm">⚠️</span>
            <div className="flex-1 font-medium leading-relaxed break-words-safe">
              {clientError || authError}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jordan.lee@university.edu"
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium py-1 px-1.5"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />

            {/* Password Complexity Checklist for Register mode */}
            {mode === 'register' && (
              <div className="mt-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <p className="font-semibold text-slate-300">Password requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                  <span className={pwdChecks.length ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                    {pwdChecks.length ? '✓' : '○'} Min 8 characters
                  </span>
                  <span className={pwdChecks.upper ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                    {pwdChecks.upper ? '✓' : '○'} Uppercase letter
                  </span>
                  <span className={pwdChecks.lower ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                    {pwdChecks.lower ? '✓' : '○'} Lowercase letter
                  </span>
                  <span className={pwdChecks.digitOrSymbol ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                    {pwdChecks.digitOrSymbol ? '✓' : '○'} Number or symbol
                  </span>
                </div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Academic Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs font-medium text-center transition flex items-center justify-center ${
                      role === 'student'
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    👨‍🎓 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('tutor')}
                    className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs font-medium text-center transition flex items-center justify-center ${
                      role === 'tutor'
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    🧑‍🏫 Tutor
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Demo Fast-Fill helper */}
        <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-800 bg-slate-900/50">
          <p className="text-[11px] text-slate-400 mb-2 font-medium flex items-center space-x-1">
            <span>⚡ Quick Demo Credentials:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('jordan.lee@university.edu', 'student')}
              className="text-[10px] min-h-[38px] flex items-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1 rounded-lg transition"
            >
              Student (Jordan Lee)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('tutor@university.edu', 'tutor')}
              className="text-[10px] min-h-[38px] flex items-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1 rounded-lg transition"
            >
              Tutor (Dr. Turing)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@university.edu', 'admin')}
              className="text-[10px] min-h-[38px] flex items-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1 rounded-lg transition"
            >
              Admin
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
