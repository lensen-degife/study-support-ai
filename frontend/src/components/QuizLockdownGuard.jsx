import React from 'react';

/**
 * Pre-quiz instructions modal explaining integrity requirements
 */
export function PreQuizLockdownModal({
  isOpen,
  onStartQuiz,
  onCancel,
  intensityLevel,
  setIntensityLevel,
  topicTitle = 'Module Quiz',
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lockdown-modal-title"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[92dvh] flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-xl shadow-sm shrink-0">
              🛡️
            </div>
            <div className="min-w-0">
              <h3 id="lockdown-modal-title" className="text-sm sm:text-base font-extrabold text-white truncate">
                Quiz Integrity & Lockdown Pre-Check
              </h3>
              <p className="text-[11px] text-indigo-300 font-medium truncate max-w-xs sm:max-w-sm">
                Topic: {topicTitle}
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-base transition shrink-0"
              aria-label="Cancel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content & Rules */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-indigo-200 leading-relaxed break-words-safe">
            <strong className="text-white block mb-1">Notice to Students:</strong>
            To ensure fair and independent academic evaluation, this quiz runs in browser lockdown mode. Standard browser events are monitored to mitigate external AI cheating.
          </div>

          <div className="space-y-2.5">
            <p className="font-bold text-slate-200">Active Lockdown Rules:</p>
            <div className="grid grid-cols-1 gap-2 text-[11px]">
              <div className="flex items-start space-x-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-sm shrink-0">🖥️</span>
                <div>
                  <strong className="text-slate-200">Forced Fullscreen:</strong>
                  <p className="text-slate-400">Quiz requires full-screen mode. Exiting full-screen pauses questions and logs an infraction.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-sm shrink-0">👁️</span>
                <div>
                  <strong className="text-slate-200">Window Focus & Tab Tracking:</strong>
                  <p className="text-slate-400">Switching tabs, opening AI sidebars, or clicking other windows is tracked with exact seconds away.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 p-2.5 bg-slate-800/60 rounded-xl border border-slate-800">
                <span className="text-sm shrink-0">📋</span>
                <div>
                  <strong className="text-slate-200">Clipboard & Anti-Scraping:</strong>
                  <p className="text-slate-400">Copying questions, right-clicking, and pasting answers from external AI assistants is disabled.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Intensity Selector */}
          <div className="pt-2">
            <label className="block font-bold text-slate-300 mb-1.5">
              Lockdown Security Level:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIntensityLevel && setIntensityLevel(1)}
                className={`p-3 min-h-[44px] rounded-xl border text-left transition ${
                  intensityLevel === 1
                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">Level 1: Casual</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Focus warnings only, no forced lock</div>
              </button>

              <button
                type="button"
                onClick={() => setIntensityLevel && setIntensityLevel(2)}
                className={`p-3 min-h-[44px] rounded-xl border text-left transition ${
                  intensityLevel === 2
                    ? 'border-indigo-500 bg-indigo-600/20 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs text-indigo-300 flex items-center justify-between">
                  <span>Level 2: Strict</span>
                  <span className="text-[9px] bg-indigo-500/30 px-1.5 py-0.5 rounded">Recommended</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Fullscreen + 3-strike auto-submit</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs transition flex items-center justify-center"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onStartQuiz}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-1.5"
          >
            <span>I Understand, Enter Fullscreen & Start</span>
            <span>➔</span>
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * Top HUD Banner shown during an active quiz session
 */
export function QuizLockdownHUD({
  intensityLevel = 2,
  violationsCount = 0,
  maxViolations = 3,
  isFullscreen = false,
  onRequestFullscreen,
}) {
  const strikesLeft = Math.max(0, maxViolations - violationsCount);

  return (
    <div className="mb-4 p-3 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
      <div className="flex items-center space-x-2.5 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="font-bold text-slate-200">🛡️ Quiz Integrity Mode:</span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate">
            {intensityLevel === 2 ? 'Strict (Fullscreen & Focus Monitored)' : 'Casual (Warnings Only)'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 text-[11px] shrink-0">
        {/* Infraction Counter */}
        <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
          <span className="font-semibold text-slate-400">Strikes:</span>
          <span
            className={`font-bold font-mono px-1.5 rounded ${
              violationsCount === 0
                ? 'text-emerald-400 bg-emerald-950/60'
                : violationsCount === 1
                ? 'text-amber-300 bg-amber-950/60'
                : 'text-rose-400 bg-rose-950/60'
            }`}
          >
            {violationsCount} / {maxViolations}
          </span>
        </div>

        {/* Fullscreen status */}
        {intensityLevel >= 2 && (
          <div>
            {isFullscreen ? (
              <span className="text-emerald-400 flex items-center space-x-1 font-medium px-2 py-1">
                <span>✓</span>
                <span>Fullscreen</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onRequestFullscreen}
                className="text-amber-300 hover:text-amber-200 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 min-h-[36px] flex items-center rounded-lg text-[10px] font-bold animate-pulse"
              >
                ⚠️ Fullscreen Required
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Warning overlay when student exits fullscreen in strict mode
 */
export function FullscreenWarningOverlay({
  isOpen,
  onResumeFullscreen,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-slate-900 border border-amber-500/50 rounded-2xl p-5 sm:p-6 text-center shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mx-auto border border-amber-500/30">
          ⚠️
        </div>
        <h3 className="text-base font-black text-white">
          Fullscreen Exited: Quiz Paused
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed break-words-safe">
          In accordance with strict assessment integrity policies, questions are hidden while outside fullscreen. An infraction event has been logged with your submission.
        </p>
        <button
          type="button"
          onClick={onResumeFullscreen}
          className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2"
        >
          <span>Resume Fullscreen</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Modal shown when student returns after tab switch / focus lost
 */
export function FocusLostWarningModal({
  isOpen,
  title,
  message,
  timeAway,
  strikes,
  maxViolations = 3,
  onDismiss,
}) {
  if (!isOpen) return null;

  const isLastWarning = strikes >= maxViolations - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      role="alertdialog"
    >
      <div className="max-w-md w-full bg-slate-900 border border-rose-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-xl shrink-0">
            🚨
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-sm text-white truncate">{title || 'Integrity Violation Detected'}</h4>
            <p className="text-[11px] text-rose-300 font-medium">
              Recorded Infraction {strikes} of {maxViolations}
            </p>
          </div>
        </div>

        <div className="text-xs space-y-2.5 text-slate-300 leading-relaxed break-words-safe">
          <p>{message}</p>
          <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-[11px] space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Time spent away:</span>
              <span className="font-mono font-bold text-white">{timeAway} seconds</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Remaining strikes:</span>
              <span className="font-mono font-bold text-amber-400">
                {Math.max(0, maxViolations - strikes)} left
              </span>
            </div>
          </div>

          {isLastWarning && (
            <p className="text-[11px] font-bold text-rose-400">
              ⚠️ Final Warning: One more infraction will immediately lock and submit your quiz.
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full min-h-[44px] py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center"
          >
            I Acknowledge & Return to Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Overlay when 3-strike threshold is exceeded and attempt is locked
 */
export function LockedOutOverlay({
  isOpen,
  violationsCount,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-fadeIn">
      <div className="max-w-md w-full bg-slate-900 border border-rose-600 rounded-2xl p-5 sm:p-6 text-center shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto border border-rose-500/40 animate-bounce">
          🔒
        </div>
        <h3 className="text-lg font-black text-white">
          Quiz Attempt Locked
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed break-words-safe">
          You have reached the maximum allowed integrity infractions ({violationsCount} infractions). Your quiz session has been locked and automatically submitted for instructor review.
        </p>
        <div className="flex items-center justify-center space-x-2 text-indigo-400 text-xs font-semibold pt-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Finalizing and submitting attempt...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating transient notification toast
 */
export function IntegrityToast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 animate-bounce">
      <div className="bg-slate-900/95 border border-amber-500/60 text-amber-200 px-4 py-2.5 rounded-xl text-xs font-medium shadow-2xl backdrop-blur-sm flex items-center space-x-2.5">
        <span className="text-base">🛡️</span>
        <span className="flex-1 leading-snug">{message}</span>
      </div>
    </div>
  );
}

/**
 * Integrity Score Review Card shown on the quiz results screen
 */
export function SubmissionIntegrityCard({ integrity }) {
  if (!integrity) return null;

  const score = integrity.score ?? 100;
  const rating = integrity.rating || (score >= 90 ? 'High Integrity' : score >= 70 ? 'Moderate Risk' : 'High Suspicion');
  const summary = integrity.summary || 'Clean session recorded.';
  const violations = integrity.violations || [];

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="text-xl shrink-0">🛡️</span>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">Quiz Integrity Audit Report</h4>
            <p className="text-[11px] text-slate-500 truncate">Anti-AI lockdown and window focus telemetry summary</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              score >= 90
                ? 'bg-emerald-100 text-emerald-800'
                : score >= 70
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {rating}
          </span>
          <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-100 text-slate-800 rounded-lg">
            Score: {score} / 100
          </span>
        </div>
      </div>

      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed break-words-safe">
        <strong className="text-slate-900 block mb-0.5">Session Summary:</strong>
        {summary}
      </div>

      {violations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-800">Recorded Infraction Timeline ({violations.length}):</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {violations.map((v, idx) => (
              <div
                key={idx}
                className="text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-1.5"
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xs shrink-0">
                    {v.event_type === 'TAB_SWITCH' ? '👁️' : v.event_type === 'FULLSCREEN_EXIT' ? '🖥️' : v.event_type === 'DEVTOOLS_KEYPRESS' ? '⚙️' : '📋'}
                  </span>
                  <span className="font-semibold text-slate-800 truncate">{v.event_type}</span>
                  <span className="text-slate-500 truncate hidden sm:inline">- {v.details}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono shrink-0">
                  {v.time_spent_away_seconds ? `${v.time_spent_away_seconds}s away • ` : ''}
                  {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
