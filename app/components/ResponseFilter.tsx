"use client";

import { useState } from "react";

// Reply and quote articles are server-rendered with `hidden-by-reply` /
// `hidden-by-quote` so they stay hidden before hydration (matching the
// unchecked defaults). Toggling a box adds/removes that class rather than
// re-rendering the timeline.
export default function ResponseFilter() {
  const [showReplies, setShowReplies] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);

  function toggle(selector: string, hiddenClass: string, show: boolean) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    nodes.forEach((node) => node.classList.toggle(hiddenClass, !show));
  }

  return (
    <div className="response-filter">
      <label className="response-filter-item">
        <input
          type="checkbox"
          checked={showReplies}
          onChange={(e) => {
            setShowReplies(e.target.checked);
            toggle('[data-reply="true"]', "hidden-by-reply", e.target.checked);
          }}
        />
        <span>Show responses</span>
      </label>
      <label className="response-filter-item">
        <input
          type="checkbox"
          checked={showQuotes}
          onChange={(e) => {
            setShowQuotes(e.target.checked);
            toggle('[data-quote="true"]', "hidden-by-quote", e.target.checked);
          }}
        />
        <span>Show quotes</span>
      </label>
    </div>
  );
}
