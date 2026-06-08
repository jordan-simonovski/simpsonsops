"use client";

import { useFeedFilters, setFilters, type FeedView } from "@/lib/feedStore";

// The profile tab bar doubles as the timeline's view selector. Single-select,
// mutually exclusive — replaces the old decorative tabs and the checkbox bar.
const TABS: { label: string; view: FeedView }[] = [
  { label: "Posts", view: "posts" },
  { label: "Replies", view: "replies" },
  { label: "Quotes", view: "quotes" },
  { label: "Media", view: "media" },
];

export default function ProfileTabs() {
  const { view } = useFeedFilters();

  return (
    <div className="tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.view}
          type="button"
          role="tab"
          aria-selected={view === tab.view}
          className={`tab${view === tab.view ? " active" : ""}`}
          onClick={() => setFilters({ view: tab.view })}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
