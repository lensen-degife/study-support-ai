import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({
  children,
  resourceName = 'personal study resources',
  onRequireAuth,
  allowedRoles = null,
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[400px]">
        <div className="flex items-center space-x-3 text-indigo-600">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-semibold text-slate-600">Verifying academic session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 bg-slate-50 min-h-[360px] sm:min-h-[480px]">
        <div className="max-w-md w-full bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/80 shadow-xl text-center space-y-4 sm:space-y-5 animate-fadeIn">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow-sm">
            🔒
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Authentication Required
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed break-words-safe">
              Please sign in to access your {resourceName}. An authenticated session ensures your diagnostic quizzes, personal study plans, and learning analytics are securely preserved.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onRequireAuth}
              className="w-full min-h-[44px] py-3 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
            >
              <span>Sign In or Create Account</span>
              <span>→</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 text-left break-words-safe">
            <span className="font-semibold text-slate-700">💡 Fast access:</span> Use the demo account button in the sign-in modal for one-click access with sample profile data.
          </div>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[400px]">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-rose-100 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl mx-auto">
            🚫
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your current role (<span className="font-semibold text-indigo-600">{user?.role}</span>) does not have permission to view this resource.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
