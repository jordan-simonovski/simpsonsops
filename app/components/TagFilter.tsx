"use client";

import type { TagCount } from "@/lib/tags";
import { useFeedFilters, setFilters } from "@/lib/feedStore";

// Single-select topic filter. Writes the active tag to the shared feed store;
// <Timeline> does the filtering against the full dataset.
export default function TagFilter({ tags }: { tags: TagCount[] }) {
  const { activeTag } = useFeedFilters();

  if (tags.length === 0) return null;

  return (
    <div className="tag-filter" role="group" aria-label="Filter by topic">
      <button
        type="button"
        className={`tag-chip${activeTag === null ? " active" : ""}`}
        onClick={() => setFilters({ activeTag: null })}
      >
        All
      </button>
      {tags.map(({ label, count }) => (
        <button
          type="button"
          key={label}
          className={`tag-chip${activeTag === label ? " active" : ""}`}
          onClick={() =>
            setFilters({ activeTag: activeTag === label ? null : label })
          }
        >
          {label}
          <span className="tag-chip-count">{count}</span>
        </button>
      ))}
    </div>
  );
}
