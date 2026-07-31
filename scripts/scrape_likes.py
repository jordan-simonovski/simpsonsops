#!/usr/bin/env python3
"""Scrape like counts for each post from the best Wayback capture available.

The `snapshot_url` stored on each post is the *first* capture, and something was
auto-archiving this account: 1012 of 1267 posts were captured within 5 minutes
of posting, when their real engagement was still 0. Scraping those is how you
end up with an archive where nothing has any likes.

So we ignore snapshot_url and pick captures on merit:

  * one CDX query lists every capture under twitter.com/SimpsonsOps*
  * per post, take the latest capture from before the legacy site was retired
    (captures after ~mid-2021 are the React SPA and carry no counts in HTML)
  * only bother fetching it if it is at least an hour after the post
  * plus every archived *profile timeline*, which renders ~20 posts per page
    with mature counts — the cheapest engagement data in the whole archive

Counts live in the screen-reader action bar, keyed by tweet id, in both the
permalink and timeline layouts:

    id="profile-tweet-action-favorite-count-aria-1330679496891011073">215 likes

So every page is harvested for all the ids it happens to contain, and a post
keeps the highest count seen (a later capture can only have gained likes).

Coverage is partial by nature: ~142 posts have a capture old enough to mean
anything. The rest were archived too early and have no recoverable engagement —
they stay without a `likes` field rather than getting a misleading 0.

Counts are cached in posts/like_scrape_cache.json, so a run that dies partway
keeps what it found; a rerun still refetches the pages (there are only ~145).

Usage:
    python3 scripts/scrape_likes.py [--limit N] [--workers N] [--write]

Without --write it only prints a report (dry run).
"""

from __future__ import annotations

import argparse
import datetime as dt
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

CDX = (
    "http://web.archive.org/cdx/search/cdx?url=twitter.com/SimpsonsOps*"
    "&output=json&fl=original,timestamp,statuscode&limit=20000"
)
# Twitter's server-rendered layout was gone well before this; later captures
# are an empty SPA shell.
LEGACY_UNTIL = "20210701"
# Below this the numbers are just "nobody has seen it yet".
MIN_LAG_SECONDS = 3600

STATUS_RE = re.compile(r"/status/(\d+)")
LIKES_RE = re.compile(
    r'id="profile-tweet-action-favorite-count-aria-(\d+)"[^>]*>([\d,]+) likes?'
)


def fetch(url: str, retries: int = 6) -> str | None:
    """GET url with exponential backoff; None on persistent failure."""
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


def parse_likes(page: str) -> dict[str, int]:
    """Every {tweet_id: likes} pair the page renders, whatever its layout."""
    return {
        tid: int(n.replace(",", ""))
        for tid, n in LIKES_RE.findall(page)
    }


def stamp(ts: str) -> dt.datetime:
    return dt.datetime.strptime(ts, "%Y%m%d%H%M%S").replace(tzinfo=dt.timezone.utc)


def pick_pages(posts: list[dict]) -> list[tuple[str, str]]:
    """(url, capture timestamp) pairs worth fetching: permalinks + timelines.

    The timestamp travels with the URL because it is what makes a count
    trustworthy — see the maturity check in main().
    """
    rows = fetch(CDX)
    if rows is None:
        print("CDX query failed", file=sys.stderr)
        return []
    try:
        captures = json.loads(rows)[1:]
    except json.JSONDecodeError:
        print("CDX returned unparseable JSON", file=sys.stderr)
        return []

    by_id: dict[str, list[tuple[str, str]]] = {}
    timelines: list[tuple[str, str]] = []
    for original, ts, status in captures:
        if status not in ("200", "-") or ts >= LEGACY_UNTIL:
            continue
        m = STATUS_RE.search(original)
        if m:
            by_id.setdefault(m.group(1), []).append((ts, original))
        elif "header_photo" not in original:
            # Anything else under the handle is a profile timeline capture
            # (bare, ?lang=en, ...) — each one is worth ~20 posts' counts.
            timelines.append((f"https://web.archive.org/web/{ts}/{original}", ts))

    pages = list(timelines)
    for p in posts:
        caps = by_id.get(p["tweet_id"])
        if not caps:
            continue
        # Request the captured URL verbatim. CDX also indexes /photo/1 and
        # ?s=20 variants under the same id; asking for the canonical permalink
        # instead lets Wayback fuzzy-match to its *nearest* capture, which is
        # the minutes-old one this whole selection exists to avoid.
        ts, original = max(caps)
        lag = (stamp(ts) - dt.datetime.fromisoformat(
            p["posted_at"].replace("Z", "+00:00"))).total_seconds()
        if lag >= MIN_LAG_SECONDS:
            pages.append((f"https://web.archive.org/web/{ts}/{original}", ts))
    return pages


def load_cache() -> dict[str, int]:
    if os.path.exists(CACHE):
        # The pre-rewrite cache stored {replies, retweets, likes} dicts at this
        # same path; drop anything that isn't a bare count.
        return {k: v for k, v in json.load(open(CACHE)).items()
                if isinstance(v, int)}
    return {}


def write_json(path: str, obj) -> None:
    """Write via a temp file in the same dir, then rename.

    statuses.json is the only copy of the archive; a plain open(w) truncates it
    the moment the process is killed. os.replace is atomic on POSIX and Windows.
    """
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0,
                    help="fetch at most N pages (0 = all)")
    ap.add_argument("--workers", type=int, default=4,
                    help="concurrent fetches; keep low, archive.org throttles")
    ap.add_argument("--write", action="store_true",
                    help="apply the counts to statuses.json")
    args = ap.parse_args()

    posts = json.load(open(STATUSES))
    posted = {
        p["tweet_id"]: dt.datetime.fromisoformat(
            p["posted_at"].replace("Z", "+00:00"))
        for p in posts
    }
    cache = load_cache()

    pages = pick_pages(posts)
    if args.limit:
        pages = pages[: args.limit]

    print(f"posts            : {len(posts)}")
    print(f"pages to fetch   : {len(pages)}")

    failures = immature = 0
    if pages:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            fetched = ex.map(lambda pt: (fetch(pt[0]), pt[1]), pages)
            for i, (page, ts) in enumerate(fetched, 1):
                if page is None:
                    failures += 1
                else:
                    captured = stamp(ts)
                    for tid, likes in parse_likes(page).items():
                        # A page yields counts for every post it renders, not
                        # just the one it was fetched for — so maturity has to
                        # be checked per harvested id, not per page. Selecting
                        # mature pages alone let a post picked up in passing
                        # keep a minutes-old count.
                        if tid not in posted:
                            continue
                        if (captured - posted[tid]).total_seconds() < MIN_LAG_SECONDS:
                            immature += 1
                            continue
                        if likes > cache.get(tid, -1):
                            cache[tid] = likes
                if i % 20 == 0 or i == len(pages):
                    print(f"  fetched {i}/{len(pages)}", file=sys.stderr)
                    write_json(CACHE, cache)
        write_json(CACHE, cache)
        print(f"wrote cache      : {CACHE}")
        print(f"counts rejected as immature: {immature}")

    nonzero = {t: n for t, n in cache.items() if n > 0}
    print(f"failed fetches   : {failures}")
    print(f"posts with counts: {len(cache)}")
    print(f"  non-zero likes : {len(nonzero)}")
    if nonzero:
        top = sorted(nonzero.items(), key=lambda kv: -kv[1])[:10]
        print(f"  max likes      : {top[0][1]}")
        text = {p["tweet_id"]: p["text"] for p in posts}
        print("\ntop 10:")
        for tid, n in top:
            print(f"  {n:>5}  {text.get(tid, '')[:60]!r}")

    if args.write:
        for p in posts:
            n = cache.get(p["tweet_id"])
            # A recovered 0 is real ("nobody liked it"), so keep it; posts with
            # no usable capture keep no field at all.
            if n is not None:
                p["likes"] = n
        write_json(STATUSES, posts)
        print(f"\nwrote            : {STATUSES}")
    else:
        print("\ndry run; pass --write to apply")
    return 0


def selftest() -> int:
    """Parser and capture-selection checks over literal fixtures. No network."""
    page = (
        '<span class="ProfileTweet-actionCount" data-tweet-stat-count="215">'
        '<span id="profile-tweet-action-favorite-count-aria-1330679496891011073"'
        ' data-aria-label-part>215 likes</span></span>'
        '<span class="ProfileTweet-actionCount" data-tweet-stat-count="3799">'
        '<span id="profile-tweet-action-favorite-count-aria-1385044311075655681"'
        ' data-aria-label-part>3,799 likes</span></span>'
        '<span id="profile-tweet-action-favorite-count-aria-1111111111111111111"'
        ' data-aria-label-part>1 like</span>'
    )
    assert parse_likes(page) == {
        "1330679496891011073": 215,
        "1385044311075655681": 3799,   # thousands separator stripped
        "1111111111111111111": 1,      # singular "like"
    }, parse_likes(page)

    # The maturity comparison main() relies on.
    post = dt.datetime(2020, 7, 3, 11, 39, tzinfo=dt.timezone.utc)
    assert (stamp("20200703114834") - post).total_seconds() < MIN_LAG_SECONDS
    assert (stamp("20201123222253") - post).total_seconds() >= MIN_LAG_SECONDS
    # Captures past the legacy cutoff render no counts and must be excluded.
    assert "20221219182806" >= LEGACY_UNTIL
    assert "20210316082727" < LEGACY_UNTIL

    print("scrape_likes selftest ok")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        raise SystemExit(selftest())
    raise SystemExit(main())
