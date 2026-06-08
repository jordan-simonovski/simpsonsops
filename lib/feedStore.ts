"use client";

import { useSyncExternalStore } from "react";

// Shared filter state for the timeline. A module-level store (not context) so
// the search box (in the right column) and the tag/response filters (in the
// main column) can drive the same windowed <Timeline> without restructuring
// the page's grid layout or prop-drilling across siblings.
// Single-select timeline view. Each value maps to a disjoint subset of the
// archive that the data can actually back — no decorative tabs.
export type FeedView = "posts" | "replies" | "quotes" | "media";

export interface FeedFilters {
  query: string;
  view: FeedView;
  activeTag: string | null;
}

const INITIAL: FeedFilters = {
  query: "",
  view: "posts",
  activeTag: null,
};

let state: FeedFilters = INITIAL;
const listeners = new Set<() => void>();

export function setFilters(patch: Partial<FeedFilters>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FeedFilters {
  return state;
}

// Server render always sees the defaults; the same constant reference keeps
// useSyncExternalStore from looping during hydration.
function getServerSnapshot(): FeedFilters {
  return INITIAL;
}

export function useFeedFilters(): FeedFilters {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
