"use client";

import { useFeedFilters, setFilters } from "@/lib/feedStore";
import { SearchIcon, ShuffleIcon } from "./icons";

// Full-text search over the whole archive. Writes the query to the shared feed
// store; <Timeline> filters the data array and re-windows. Searches every post,
// not just the ones currently scrolled into view.
export default function SearchBar() {
  const { query } = useFeedFilters();

  return (
    <>
      <aside className="col-right" aria-label="Search">
        <div className="search-box">
          <div className="search-field">
            <span className="search-icon">
              <SearchIcon width={18} height={18} />
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Search posts"
              aria-label="Search posts"
              value={query}
              onChange={(e) => setFilters({ query: e.target.value })}
            />
          </div>
          <a className="random-btn" href="/random">
            <ShuffleIcon width={18} height={18} />
            Random post
          </a>
        </div>
      </aside>
      <a className="random-fab" href="/random" aria-label="Random post">
        <ShuffleIcon width={24} height={24} />
      </a>
    </>
  );
}
