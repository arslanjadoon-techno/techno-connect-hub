"use client";

import { useEffect, useState } from "react";

export function useElementVisible(id: string, enabled = true) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const element = document.getElementById(id);
    if (!element || typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setVisible(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, enabled]);

  return enabled && visible;
}
