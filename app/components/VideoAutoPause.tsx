"use client";

import { useEffect } from "react";

// One IntersectionObserver for the whole timeline so the 1267-tweet feed stays
// JS-free: videos are plain server-rendered <video class="tweet-video">. A
// video that scrolls fully out of the viewport gets paused so audio doesn't
// keep playing off-screen.
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

    const videos = document.querySelectorAll<HTMLVideoElement>(".tweet-video");
    videos.forEach((v) => observer.observe(v));

    return () => observer.disconnect();
  }, []);

  return null;
}
