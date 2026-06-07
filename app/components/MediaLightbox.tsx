"use client";

import { useCallback, useEffect, useState } from "react";

// Single delegated listener so the timeline stays JS-free: media cells are
// plain server-rendered <button data-media-src="...">. Clicking one opens a
// scrollable full-size overlay (needed for tall vertical comic strips).
export default function MediaLightbox() {
  const [items, setItems] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const open = items.length > 0;

  const close = useCallback(() => setItems([]), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLElement>("[data-media-src]");
      if (!btn) return;
      e.preventDefault();

      const grid = btn.closest(".media-grid");
      const nodes = grid
        ? Array.from(grid.querySelectorAll<HTMLElement>("[data-media-src]"))
        : [btn];
      const srcs = nodes
        .map((n) => n.getAttribute("data-media-src"))
        .filter((s): s is string => Boolean(s));
      const i = Math.max(0, nodes.indexOf(btn));

      setItems(srcs);
      setIndex(i);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + items.length) % items.length);
      else if (e.key === "ArrowRight")
        setIndex((i) => (i + 1) % items.length);
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, items.length, close]);

  if (!open) return null;

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  // Cross-origin blob storage may or may not allow fetch; fall back to opening
  // the original in a new tab so the button never silently dies.
  async function download(src: string) {
    const name = decodeURIComponent(src.split("/").pop() || "image");
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
    }
  }

  function copyUrl(src: string) {
    navigator.clipboard?.writeText(src).catch(() => {});
  }

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={close}
    >
      <button
        type="button"
        className="lightbox-close"
        aria-label="Close"
        onClick={close}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z" />
        </svg>
      </button>

      <div className="lightbox-tools" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="lightbox-tool"
          aria-label="Download image"
          title="Download image"
          onClick={() => download(items[index])}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3 1.4 1.42L12 17.4l-5.7-5.69 1.4-1.42 3.3 3.3V4a1 1 0 0 1 1-1zM5 19h14v2H5z" />
          </svg>
        </button>
        <button
          type="button"
          className="lightbox-tool"
          aria-label="Copy image link"
          title="Copy image link"
          onClick={() => copyUrl(items[index])}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.36 5.64c-1.95-1.96-5.11-1.96-7.07 0L9.88 7.05 8.46 5.64l1.42-1.42c2.73-2.73 7.16-2.73 9.9 0 2.73 2.74 2.73 7.17 0 9.9l-1.42 1.42-1.41-1.42 1.41-1.41c1.96-1.96 1.96-5.12 0-7.07zm-2.12 3.53l-7.07 7.07-1.41-1.41 7.07-7.07 1.41 1.41zm-12.02.71l1.42-1.42 1.41 1.42-1.41 1.41c-1.96 1.96-1.96 5.12 0 7.07 1.95 1.96 5.11 1.96 7.07 0l1.41-1.41 1.42 1.41-1.42 1.42c-2.73 2.73-7.16 2.73-9.9 0-2.73-2.74-2.73-7.17 0-9.9z" />
          </svg>
        </button>
      </div>

      {items.length > 1 ? (
        <button
          type="button"
          className="lightbox-nav prev"
          aria-label="Previous image"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
        >
          ‹
        </button>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lightbox-img"
        src={items[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
      />

      {items.length > 1 ? (
        <>
          <button
            type="button"
            className="lightbox-nav next"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
          >
            ›
          </button>
          <div className="lightbox-count" onClick={(e) => e.stopPropagation()}>
            {index + 1} / {items.length}
          </div>
        </>
      ) : null}
    </div>
  );
}
