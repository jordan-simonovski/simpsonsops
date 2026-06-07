#!/usr/bin/env python3
"""Place GIF mp4s by scraping their Wayback snapshot pages.

Twitter GIFs (silent mp4, no embedded creation_time) can't be matched by
timestamp. But each GIF post's archived page references the GIF's media id as
`pbs.twimg.com/tweet_video_thumb/<ID>.jpg`, and the GIF file is `<ID>.mp4`.
So we scrape the snapshot of every post that still has no media/video and join
on that id.

The scrape is resumable: per-post results are cached in posts/gif_scrape_cache.json
so re-running only fetches what's missing. Pass --write to apply matches to
statuses.json.

Usage:
    python3 scripts/map_gifs.py            # scrape + cache (dry run)
    python3 scripts/map_gifs.py --write    # scrape + apply to statuses.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUSES = os.path.join(REPO, "posts", "statuses.json")
UNMATCHED = os.path.join(REPO, "posts", "unmatched_media.json")
CACHE = os.path.join(REPO, "posts", "gif_scrape_cache.json")

THUMB_RE = re.compile(r"tweet_video_thumb/([A-Za-z0-9_-]+)\.jpg")
UA = "Mozilla/5.0 (simpsonsops-archivist; media-remap)"
TIMEOUT = 30
PAUSE_S = 0.4          # be polite to web.archive.org
MAX_RETRIES = 4


def fetch(url: str) -> str | None:
    """GET with backoff on throttle/5xx. Returns body or None."""
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 502, 500):
                time.sleep(2 ** attempt)
                continue
            return None
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(2 ** attempt)
    return None


def thumb_ids(html: str, gif_ids: set[str]) -> list[str]:
    """Media ids in the page that correspond to a known GIF file, in order."""
    seen: list[str] = []
    for m in THUMB_RE.findall(html):
        if m in gif_ids and m not in seen:
            seen.append(m)
    return seen


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    posts = json.load(open(STATUSES))
    by_id = {p["tweet_id"]: p for p in posts}
    gif_files = set(json.load(open(UNMATCHED))["gifs"])
    gif_ids = {g[:-4] for g in gif_files}

    cache: dict[str, list[str]] = {}
    if os.path.exists(CACHE):
        cache = json.load(open(CACHE))

    candidates = [
        p for p in posts if not p.get("media") and not p.get("video")
    ]
    todo = [p for p in candidates if p["tweet_id"] not in cache]
    print(f"candidates: {len(candidates)}  cached: {len(cache)}  to fetch: {len(todo)}")

    for i, p in enumerate(todo, 1):
        html = fetch(p["snapshot_url"])
        cache[p["tweet_id"]] = thumb_ids(html, gif_ids) if html else []
        if i % 25 == 0 or i == len(todo):
            json.dump(cache, open(CACHE, "w"))
            hits = sum(1 for v in cache.values() if v)
            print(f"  {i}/{len(todo)} fetched, {hits} posts with a gif id")
        time.sleep(PAUSE_S)
    json.dump(cache, open(CACHE, "w"))

    # Assign unique gif -> post. A post may list several ids (quotes); take the
    # first not yet used.
    used: set[str] = set()
    matched: dict[str, str] = {}  # tweet_id -> gif file
    for tid, ids in cache.items():
        for mid in ids:
            if mid not in used:
                used.add(mid)
                matched[tid] = mid + ".mp4"
                break

    remaining = sorted(gif_files - {f for f in matched.values()})
    print(f"\ngif files        : {len(gif_files)}")
    print(f"placed via wayback: {len(matched)}")
    print(f"still unplaced    : {len(remaining)}")

    if args.write:
        for tid, fname in matched.items():
            p = by_id[tid]
            p["video"] = fname
            p["has_video"] = True
        json.dump(posts, open(STATUSES, "w"), ensure_ascii=False, indent=2)
        report = json.load(open(UNMATCHED))
        report["gifs"] = remaining
        json.dump(report, open(UNMATCHED, "w"), ensure_ascii=False, indent=2)
        print(f"\nwrote {STATUSES}")
        print(f"wrote {UNMATCHED}")
    else:
        print("\ndry run; pass --write to apply")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
