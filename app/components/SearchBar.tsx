"use client";

import { useState } from "react";
import { SearchIcon } from "./icons";

// Full-text search over the server-rendered timeline. Each tweet article
// carries a lowercased data-search-text attribute; we toggle visibility
// rather than re-rendering, so the timeline stays static.
export default function SearchBar() {
  const [value, setValue] = useState("");

  function apply(raw: string) {
    setValue(raw);
    const query = raw.trim().toLowerCase();
    const nodes = document.querySelectorAll<HTMLElement>("[data-search-text]");
    let visible = 0;

    nodes.forEach((node) => {
      const haystack = node.getAttribute("data-search-text") ?? "";
      const match = !query || haystack.includes(query);
      node.classList.toggle("hidden-by-search", !match);
      if (match) visible += 1;
    });

    const empty = document.getElementById("search-empty");
    if (empty) empty.hidden = !(query.length > 0 && visible === 0);
  }

  return (
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
            value={value}
            onChange={(e) => apply(e.target.value)}
          />
        </div>
      </div>
    </aside>
  );
}
