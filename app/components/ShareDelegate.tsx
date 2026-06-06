"use client";

import { useEffect, useState } from "react";

// Single delegated listener so the 1267-tweet timeline stays JS-free:
// share buttons are plain server-rendered <button data-share-id="...">.
export default function ShareDelegate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function show() {
      setVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 1800);
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-share-id]");
      if (!el) return;
      e.preventDefault();

      const id = el.getAttribute("data-share-id");
      if (!id) return;
      const url = `${window.location.origin}/status/${id}`;

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(show, show);
      } else {
        show();
      }
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;
  return <div className="toast">Copied link to clipboard</div>;
}
