import { useState, useEffect, useRef, useCallback } from 'react';
import { logQuizViolation } from '../services/api';

/**
 * Custom hook to enforce browser-level quiz lockdown, anti-cheat mechanisms,
 * and violation telemetry logging.
 *
 * @param {Object} options
 * @param {boolean} options.isActive - Whether the lockdown monitoring is active
 * @param {string} options.attemptId - Unique quiz attempt identifier for telemetry logging
 * @param {number} options.intensityLevel - 1: Casual (warnings only), 2: Strict (fullscreen + auto-submit)
 * @param {number} options.maxViolations - Violation strike threshold before auto-submit (default: 3)
 * @param {boolean} options.allowPaste - Whether pasting into text inputs is allowed (default: false)
 * @param {Function} options.onAutoSubmit - Callback invoked when maximum violations threshold is reached
 */
export function useQuizIntegrity({
  isActive = false,
  attemptId = null,
  intensityLevel = 2,
  maxViolations = 3,
  allowPaste = false,
  onAutoSubmit = null,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenWarningOpen, setIsFullscreenWarningOpen] = useState(false);
  const [violationsCount, setViolationsCount] = useState(0);
  const [violationsList, setViolationsList] = useState([]);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    timeAway: 0,
    strikes: 0,
  });
  const [toastMessage, setToastMessage] = useState(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const awayStartRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const lastActionTimeRef = useRef(0);
  const isAutoSubmittingRef = useRef(false);

  // Helper to show transient notification banner
  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Central violation recording function
  const recordViolation = useCallback(
    async (eventType, timeSpentAwaySeconds = 0, details = '') => {
      if (!isActive || !attemptId || isAutoSubmittingRef.current) return;

      const violationRecord = {
        eventType,
        timestamp: new Date().toISOString(),
        timeSpentAwaySeconds,
        details,
      };

      setViolationsList((prev) => [...prev, violationRecord]);
      setViolationsCount((prev) => {
        const nextCount = prev + 1;

        // Check if strict 3-strike threshold exceeded
        if (intensityLevel >= 2 && nextCount >= maxViolations && !isAutoSubmittingRef.current) {
          isAutoSubmittingRef.current = true;
          setIsLockedOut(true);
          if (onAutoSubmit) {
            setTimeout(() => {
              onAutoSubmit();
            }, 1800);
          }
        }

        return nextCount;
      });

      // Send telemetry to backend asynchronously
      try {
        await logQuizViolation(attemptId, {
          eventType,
          timeSpentAwaySeconds,
          details,
        });
      } catch (err) {
        console.warn('Failed to send quiz telemetry log:', err.message);
      }
    },
    [isActive, attemptId, intensityLevel, maxViolations, onAutoSubmit]
  );

  // Fullscreen controller
  const requestFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setIsFullscreenWarningOpen(false);
      setIsPermissionDenied(false);
    } catch (err) {
      console.warn('Fullscreen request failed or was denied:', err.message);
      setIsPermissionDenied(true);
      setIsFullscreenWarningOpen(false);
      showToast('⚠️ Fullscreen could not be engaged. Focused window mode active.');
    }
  }, [showToast]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Exit fullscreen error:', err);
    }
  }, []);

  // Monitor Fullscreen changes
  useEffect(() => {
    if (!isActive) return;

    const handleFullscreenChange = () => {
      const currentlyFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );

      setIsFullscreen(currentlyFullscreen);

      // If exited fullscreen while strict mode is active
      if (!currentlyFullscreen && intensityLevel >= 2) {
        setIsFullscreenWarningOpen(true);
        recordViolation(
          'FULLSCREEN_EXIT',
          0,
          'User exited mandatory fullscreen mode'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isActive, intensityLevel, recordViolation]);

  // Monitor Tab Switches & Window Focus (Page Visibility API + window blur)
  useEffect(() => {
    if (!isActive) return;

    const handleWindowLeave = () => {
      const now = Date.now();
      // Debounce rapid blur/visibility events
      if (awayStartRef.current === null) {
        awayStartRef.current = now;
      }
    };

    const handleWindowReturn = () => {
      const now = Date.now();
      if (awayStartRef.current !== null) {
        const timeAwaySeconds = Math.max(1, Math.round((now - awayStartRef.current) / 1000));
        awayStartRef.current = null;

        // Debounce if return happens in less than 400ms (accidental click)
        if (now - lastActionTimeRef.current > 600) {
          lastActionTimeRef.current = now;

          recordViolation(
            'TAB_SWITCH',
            timeAwaySeconds,
            `User navigated away from active quiz window for ${timeAwaySeconds}s`
          );

          // Prompt return warning modal
          setWarningModal({
            isOpen: true,
            title: 'Quiz Integrity Warning: Window Focus Lost',
            message: `You navigated away from the quiz window for ${timeAwaySeconds} second${timeAwaySeconds > 1 ? 's' : ''}. External tab switching and opening AI assistants are flagged as academic integrity infractions.`,
            timeAway: timeAwaySeconds,
            strikes: violationsCount + 1,
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleWindowLeave();
      } else {
        handleWindowReturn();
      }
    };

    window.addEventListener('blur', handleWindowLeave);
    window.addEventListener('focus', handleWindowReturn);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowLeave);
      window.removeEventListener('focus', handleWindowReturn);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, violationsCount, recordViolation]);

  // Clipboard & Input Sanitization (Outbound question copying & Inbound AI answer pasting)
  useEffect(() => {
    if (!isActive) return;

    const handleCopyCut = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showToast('⚠️ Copying quiz questions is disabled to protect assessment integrity.');
      recordViolation(
        'CLIPBOARD_ATTEMPT',
        0,
        'Attempted to copy or cut quiz question content'
      );
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showToast('⚠️ Right-click context menu is disabled during the quiz.');
    };

    const handlePaste = (e) => {
      if (!allowPaste) {
        e.preventDefault();
        e.stopPropagation();
        showToast('⚠️ Direct pasting of external text into answers is blocked.');
        recordViolation(
          'CLIPBOARD_ATTEMPT',
          0,
          'Attempted to paste external text into quiz response'
        );
      }
    };

    document.addEventListener('copy', handleCopyCut, true);
    document.addEventListener('cut', handleCopyCut, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('copy', handleCopyCut, true);
      document.removeEventListener('cut', handleCopyCut, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [isActive, allowPaste, showToast, recordViolation]);

  // Shortcut & Developer Tools Mitigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // F12 or DevTools inspect combinations
      const isDevTools =
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (isCtrlOrCmd && key === 'u'); // View page source

      // Print shortcut
      const isPrint = isCtrlOrCmd && key === 'p';

      // Copy/Cut/Paste keyboard shortcuts
      const isCopyCut = isCtrlOrCmd && ['c', 'x'].includes(key);
      const isPaste = isCtrlOrCmd && key === 'v';

      if (isDevTools) {
        e.preventDefault();
        e.stopPropagation();
        showToast('⚠️ Developer tools and inspect shortcuts are prohibited.');
        recordViolation(
          'DEVTOOLS_KEYPRESS',
          0,
          `Pressed inspect / devtools shortcut: ${e.key}`
        );
        return;
      }

      if (isPrint) {
        e.preventDefault();
        e.stopPropagation();
        showToast('⚠️ Printing quiz content is disabled.');
        return;
      }

      if (isCopyCut) {
        e.preventDefault();
        e.stopPropagation();
        showToast('⚠️ Copy shortcut is disabled during the quiz.');
        recordViolation(
          'CLIPBOARD_ATTEMPT',
          0,
          `Used keyboard shortcut: ${e.metaKey ? 'Cmd' : 'Ctrl'}+${key.toUpperCase()}`
        );
        return;
      }

      if (isPaste && !allowPaste) {
        e.preventDefault();
        e.stopPropagation();
        showToast('⚠️ Paste shortcut is disabled during the quiz.');
        recordViolation(
          'CLIPBOARD_ATTEMPT',
          0,
          `Used paste shortcut: ${e.metaKey ? 'Cmd' : 'Ctrl'}+V`
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive, allowPaste, showToast, recordViolation]);

  // Dismiss warnings
  const dismissWarningModal = useCallback(() => {
    setWarningModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const resetIntegrityState = useCallback(() => {
    setIsFullscreen(false);
    setIsFullscreenWarningOpen(false);
    setViolationsCount(0);
    setViolationsList([]);
    setIsLockedOut(false);
    setIsPermissionDenied(false);
    setWarningModal({ isOpen: false, title: '', message: '', timeAway: 0, strikes: 0 });
    isAutoSubmittingRef.current = false;
  }, []);

  return {
    isFullscreen,
    isFullscreenWarningOpen,
    violationsCount,
    violationsList,
    isLockedOut,
    warningModal,
    toastMessage,
    isPermissionDenied,
    requestFullscreen,
    exitFullscreen,
    dismissWarningModal,
    resetIntegrityState,
  };
}
