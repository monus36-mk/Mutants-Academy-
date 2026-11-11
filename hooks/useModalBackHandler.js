'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to allow mobile back button to close modals/drawers
 * instead of exiting the PWA or navigating away from the page.
 * 
 * @param {boolean} isOpen - Whether the modal/drawer is open
 * @param {function} setIsOpen - State setter to close modal
 * @param {string} modalId - Unique identifier for modal debugging
 */
export function useModalBackHandler(isOpen, setIsOpen, modalId = 'modal') {
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isOpen) {
      // If modal was closed by clicking 'X' or backdrop, and we previously pushed history,
      // pop it so dummy modal history doesn't stay in the browser stack
      if (isPushedRef.current) {
        if (window.history.state?.isModal) {
          window.history.back();
        }
        isPushedRef.current = false;
      }
      return;
    }

    // Modal opened: push a state to history so pressing back fires 'popstate' instead of leaving the app
    window.history.pushState(
      { ...(window.history.state || {}), isModal: true, modalId, timestamp: Date.now() },
      ''
    );
    isPushedRef.current = true;

    const handlePopState = () => {
      // Hardware / browser back button was pressed: close modal!
      setIsOpen(false);
      isPushedRef.current = false;
    };

    window.addEventListener('popstate', handlePopState, { once: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (isPushedRef.current) {
        if (window.history.state?.isModal) {
          window.history.back();
        }
        isPushedRef.current = false;
      }
    };
  }, [isOpen, setIsOpen, modalId]);
}
