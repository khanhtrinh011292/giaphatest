"use client";

import { useEffect } from "react";

/**
 * Locks document body scroll while the component is mounted.
 * This prevents mobile browsers from showing/hiding their navigation bar
 * when the user pans or zooms inside a full-screen canvas view.
 */
export function useLockBodyScroll(active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
    };
  }, [active]);
}
