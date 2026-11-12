'use client';

import { useEffect, useRef } from 'react';

let modalTokenCounter = 0;
let pendingBackCleanup = null;

/**
 * Custom hook to allow mobile back button to close modals/drawers
 * instead of exiting the PWA or navigating away from the page.
 *
 * @param {boolean} isOpen - Whether the modal/drawer is open
 * @param {function} setIsOpen - State setter or close callback
 * @param {string} modalId - Unique identifier for modal debugging
 */
export function useModalBackHandler(isOpen, setIsOpen, modalId = 'modal') {
  const pushedTokenRef = useRef(null);
  const setIsOpenRef = useRef(setIsOpen);

  // Keep latest close callback without tearing down history entries when inline callbacks re-render
  useEffect(() => {
    setIsOpenRef.current = setIsOpen;
  }, [setIsOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    const token = `${modalId}_${++modalTokenCounter}`;

    // Reuse an entry whose cleanup was queued in this synchronous commit (Strict Mode or modal swap)
    // to prevent an async history.back() -> popstate race from auto-closing the freshly opened modal.
    if (
      pendingBackCleanup &&
      !pendingBackCleanup.cancelled &&
      window.history.state?.isModal &&
      window.history.state?.modalToken === pendingBackCleanup.token
    ) {
      pendingBackCleanup.cancelled = true;
      pendingBackCleanup = null;
      window.history.replaceState(
        {
          ...(window.history.state || {}),
          isModal: true,
          modalId,
          modalToken: token,
          timestamp: Date.now(),
        },
        ''
      );
    } else {
      window.history.pushState(
        {
          ...(window.history.state || {}),
          isModal: true,
          modalId,
          modalToken: token,
          timestamp: Date.now(),
        },
        ''
      );
    }

    pushedTokenRef.current = token;

    const handlePopState = (event) => {
      // Stepping back onto this modal's own entry from a nested child modal should leave this modal open
      if (event.state?.isModal && event.state?.modalToken === pushedTokenRef.current) {
        return;
      }

      if (pushedTokenRef.current === token) {
        pushedTokenRef.current = null;
        setIsOpenRef.current(false);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      const shouldPop =
        pushedTokenRef.current === token &&
        window.history.state?.isModal &&
        window.history.state?.modalToken === token;

      pushedTokenRef.current = null;

      if (!shouldPop) return;

      const scheduled = { token, cancelled: false };
      pendingBackCleanup = scheduled;

      queueMicrotask(() => {
        if (pendingBackCleanup === scheduled) {
          pendingBackCleanup = null;
        }
        if (
          !scheduled.cancelled &&
          typeof window !== 'undefined' &&
          window.history.state?.isModal &&
          window.history.state?.modalToken === token
        ) {
          window.history.back();
        }
      });
    };
  }, [isOpen, modalId]);
}
