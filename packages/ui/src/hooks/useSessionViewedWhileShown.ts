import React from 'react';

import { markSessionViewed } from '@/sync/notification-store';
import { markSessionViewedRemote } from '@/sync/session-viewed';
import { setExternallyViewedSession } from '@/sync/sync-context';

/**
 * Treats a session shown in a secondary surface (a docked chat tab, the
 * expanded `/btw` sheet) as viewed for as long as it is on screen and the
 * window is attended: clears the local unread marker, acknowledges the view on
 * the server (`session.view`, so `time.viewed` catches up with `time.idle`)
 * and registers the session with the sync layer so a turn that ends meanwhile
 * is recorded as seen instead of raising an unseen marker.
 *
 * Runs on mount, every 10 s (the sync layer's registration expires) and on
 * window focus/blur and visibility changes. A hidden or unfocused window
 * unregisters the session; so does unmounting or disabling.
 */
export const useSessionViewedWhileShown = (
  directory: string | null,
  sessionId: string | null,
  enabled: boolean,
): void => {
  React.useEffect(() => {
    if (!enabled || !directory || !sessionId || typeof window === 'undefined') {
      return;
    }

    const markViewed = () => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        setExternallyViewedSession(directory, sessionId, false);
        return;
      }

      markSessionViewed(sessionId);
      markSessionViewedRemote(sessionId, directory);
      setExternallyViewedSession(directory, sessionId, true);
    };

    markViewed();
    const interval = window.setInterval(markViewed, 10_000);
    window.addEventListener('focus', markViewed);
    window.addEventListener('blur', markViewed);
    document.addEventListener('visibilitychange', markViewed);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', markViewed);
      window.removeEventListener('blur', markViewed);
      document.removeEventListener('visibilitychange', markViewed);
      setExternallyViewedSession(directory, sessionId, false);
    };
  }, [directory, sessionId, enabled]);
};
