"use client";

import { useState } from "react";
import type { TagCount } from "@/lib/tags";

// Single-select topic filter. Like ResponseFilter, this toggles a
// `hidden-by-tag` class on server-rendered articles instead of re-rendering
// the timeline. Visibility composes with the other hidden-by-* classes.
export default function TagFilter({ tags }: { tags: TagCount[] }) {
  const [active, setActive] = useState<string | null>(null);

  if (tags.length === 0) return null;

  function select(label: string | null) {
    setActive(label);
    const nodes = document.querySelectorAll<HTMLElement>("[data-search-text]");
    nodes.forEach((node) => {
      const owned = (node.getAttribute("data-tags") ?? "").split(" ");
      const hide = label !== null && !owned.includes(label);
      node.classList.toggle("hidden-by-tag", hide);
    });
  }

  return (
    <div className="tag-filter" role="group" aria-label="Filter by topic">
      <button
        type="button"
        className={`tag-chip${active === null ? " active" : ""}`}
        onClick={() => select(null)}
      >
        All
      </button>
      {tags.map(({ label, count }) => (
        <button
          type="button"
          key={label}
          className={`tag-chip${active === label ? " active" : ""}`}
          onClick={() => select(active === label ? null : label)}
        >
          {label}
          <span className="tag-chip-count">{count}</span>
        </button>
      ))}
    </div>
  );
}
