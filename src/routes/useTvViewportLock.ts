import { useEffect } from "react";

const TV_VIEWPORT_LOCK_CLASS = "tv-viewport-lock";

export function useTvViewportLock() {
  useEffect(() => {
    const root = document.getElementById("root");
    const targets: Element[] = [document.documentElement, document.body];

    if (root) {
      targets.push(root);
    }

    targets.forEach((target) => {
      target.classList.add(TV_VIEWPORT_LOCK_CLASS);
    });

    return () => {
      targets.forEach((target) => {
        target.classList.remove(TV_VIEWPORT_LOCK_CLASS);
      });
    };
  }, []);
}
