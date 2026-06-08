"use client";

import { useEffect } from "react";

// One IntersectionObserver for the whole timeline: a video that scrolls fully
// out of the viewport gets paused so audio doesn't keep playing off-screen.
// The timeline appends posts as you scroll, so newly inserted videos are
// picked up via a MutationObserver rather than a one-time mount scan.
export default function VideoAutoPause() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) continue;
          const video = entry.target as HTMLVideoElement;
          if (!video.paused) video.pause();
        }
      },
      { threshold: 0 }
    );

    function observeIn(root: ParentNode) {
      root
        .querySelectorAll<HTMLVideoElement>(".tweet-video")
        .forEach((v) => observer.observe(v));
    }

    observeIn(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) observeIn(node as Element);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
