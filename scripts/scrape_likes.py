#!/usr/bin/env python3
"""Scrape like/retweet/reply counts for each post from its Wayback snapshot.

Each post in statuses.json has a `snapshot_url` pointing at a 2020-era legacy
Twitter permalink page. That HTML carries the engagement numbers in the
screen-reader action bar of the original tweet:

    <span class="ProfileTweet-action--favorite u-hiddenVisually">
      ... data-tweet-stat-count="123" ...

We scope to the `js-original-tweet` container (so replies rendered below the
tweet can't leak in) and read the reply/retweet/favorite counts from there.

Caveat: many snapshots were captured seconds after posting, so their counts are
0. That is the real engagement at capture time, not a parse error. The summary
reports how many posts actually had non-zero likes.

Responses are cached in posts/like_scrape_cache.json so reruns are cheap and
don't re-hit archive.org.

Usage:
    python3 scripts/scrape_likes.py [--limit N] [--workers N] [--write]

Without --write it only prints a report (dry run).
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUSES = os.path.join(REPO, "posts", "statuses.json")
CACHE = os.path.join(REPO, "posts", "like_scrape_cache.json")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# The original tweet's action bar. Each hidden action span is immediately
# followed by its numeric stat-count; the visible spans carry no number.
ORIGINAL_RE = re.compile(r'js-original-tweet.*?(?=js-original-tweet|$)', re.S)
STAT_RE = re.compile(
    r'ProfileTweet-action--(reply|retweet|favorite)[^"]*"'
    r'.*?data-tweet-stat-count="(\d+)"',
    re.S,
)


def fetch(url: str, retries: int = 6) -> str | None:
    """GET url with exponential backoff; None on persistent failure.

    archive.org drops bursts at the connection level (refused / reset), so we
    treat any network error as retryable with a growing, jittered backoff.
    """
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": UA})
            with urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except (HTTPError, URLError, TimeoutError, OSError):
            if attempt == retries - 1:
                return None
            time.sleep(min(60, 3 * 2 ** attempt) + random.uniform(0, 1))
    return None


def parse_counts(html: str) -> dict[str, int] | None:
    """Return {replies, retweets, likes} for the original tweet, or None."""
    block = ORIGINAL_RE.search(html)
    if not block:
        return None
    counts: dict[str, int] = {}
    for action, n in STAT_RE.findall(block.group(0)):
        # First occurrence wins (the hidden, authoritative span comes first).
        key = {"reply": "replies", "retweet": "retweets", "favorite": "likes"}[action]
        counts.setdefault(key, int(n))
    if "likes" not in counts:
        return None
    return counts


def load_cache() -> dict[str, dict[str, int]]:
    if os.path.exists(CACHE):
        return json.load(open(CACHE))
    return {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0,
                    help="process at most N uncached posts (0 = all)")
    ap.add_argument("--workers", type=int, default=4,
                    help="concurrent fetches; keep low, archive.org throttles")
    ap.add_argument("--write", action="store_true",
                    help="apply counts to statuses.json")
    args = ap.parse_args()

    posts = json.load(open(STATUSES))
    cache = load_cache()

    todo = [
        p for p in posts
        if p.get("snapshot_url") and p["tweet_id"] not in cache
    ]
    if args.limit:
        todo = todo[: args.limit]

    print(f"posts            : {len(posts)}")
    print(f"cached           : {len(cache)}")
    print(f"to fetch         : {len(todo)}")

    failures: list[str] = []

    def work(p: dict) -> tuple[str, dict[str, int] | None]:
        html = fetch(p["snapshot_url"])
        if html is None:
            return p["tweet_id"], None
        return p["tweet_id"], parse_counts(html)

    if todo:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            for i, (tid, counts) in enumerate(ex.map(work, todo), 1):
                if counts is None:
                    failures.append(tid)
                else:
                    cache[tid] = counts
                if i % 25 == 0 or i == len(todo):
                    print(f"  fetched {i}/{len(todo)}", file=sys.stderr)
        json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=2)
        print(f"wrote cache      : {CACHE}")

    parsed = [cache[p["tweet_id"]] for p in posts if p["tweet_id"] in cache]
    nonzero = [c for c in parsed if c["likes"] > 0]
    print(f"parsed           : {len(parsed)}")
    print(f"failed/no-data   : {len(failures)}")
    print(f"non-zero likes   : {len(nonzero)}")
    if parsed:
        total = sum(c["likes"] for c in parsed)
        top = max(parsed, key=lambda c: c["likes"])
        print(f"total likes      : {total}")
        print(f"max likes        : {top['likes']}")

    if args.write:
        for p in posts:
            c = cache.get(p["tweet_id"])
            if c:
                p["likes"] = c["likes"]
                p["retweets"] = c["retweets"]
                p["replies"] = c["replies"]
        json.dump(posts, open(STATUSES, "w"), ensure_ascii=False, indent=2)
        print(f"wrote            : {STATUSES}")
    else:
        print("\ndry run; pass --write to apply")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
