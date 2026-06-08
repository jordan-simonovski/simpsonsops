"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Tweet as TweetType } from "@/lib/tweets";
import { tagsFor } from "@/lib/tags";
import { useFeedFilters } from "@/lib/feedStore";
import Tweet from "./Tweet";

// How many posts to add per scroll step. The whole archive ships to the client
// once (~106KB gzip), but only a window is ever in the DOM — that is the fix
// for the 2000-node mobile timeline.
const BATCH = 15;

interface IndexedTweet {
  tweet: TweetType;
  search: string;
  isReply: boolean;
  isQuote: boolean;
  hasMedia: boolean;
  tags: string[];
}

export default function Timeline({ tweets }: { tweets: TweetType[] }) {
  const filters = useFeedFilters();

  // Precompute the derived fields filtering needs, once per dataset. This used
  // to live in data-* attributes on every server-rendered article.
  const indexed = useMemo<IndexedTweet[]>(
    () =>
      tweets.map((tweet) => {
        const isReply = Boolean(tweet.reply_to && !tweet.reply_to.text);
        const isQuote = Boolean(tweet.reply_to && tweet.reply_to.text);
        const hasMedia = tweet.media.length > 0 || Boolean(tweet.has_video);
        const search = [
          tweet.text,
          tweet.reply_to?.text ?? "",
          tweet.reply_to?.username ?? "",
          tweet.reply_to?.author_display_name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return {
          tweet,
          search,
          isReply,
          isQuote,
          hasMedia,
          tags: tagsFor(tweet),
        };
      }),
    [tweets]
  );

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return indexed.filter((it) => {
      switch (filters.view) {
        case "posts":
          if (it.isReply || it.isQuote) return false;
          break;
        case "replies":
          if (!it.isReply) return false;
          break;
        case "quotes":
          if (!it.isQuote) return false;
          break;
        case "media":
          if (!it.hasMedia) return false;
          break;
      }
      if (filters.activeTag && !it.tags.includes(filters.activeTag)) return false;
      if (q && !it.search.includes(q)) return false;
      return true;
    });
  }, [indexed, filters]);

  const [visibleCount, setVisibleCount] = useState(BATCH);

  // Any filter change resets the window back to the first batch.
  useEffect(() => {
    setVisibleCount(BATCH);
  }, [filters]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Recreate the observer whenever the window grows: if the sentinel is still
  // in view after a batch loads (intersection state unchanged), a fresh
  // observe() re-fires the callback, so the feed keeps filling until the
  // sentinel scrolls out of the look-ahead margin.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => c + BATCH);
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visibleCount]);

  const isEmpty = filtered.length === 0;
  const querying = filters.query.trim().length > 0;

  return (
    <>
      {isEmpty ? (
        <p className="search-empty">
          {querying
            ? "No posts match your search."
            : "No posts match these filters."}
        </p>
      ) : null}

      <section aria-label="Posts">
        {visible.map((it) => (
          <Tweet key={it.tweet.tweet_id} tweet={it.tweet} />
        ))}
      </section>

      {hasMore ? (
        <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
      ) : null}
    </>
  );
}
