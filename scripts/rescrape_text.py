#!/usr/bin/env python3
"""Re-extract each post's full text from its Wayback snapshot.

The texts in statuses.json were truncated at the first apostrophe by whatever
built the file originally ("Can" instead of "Can't wait to ..."). The archive
itself is fine — the snapshot HTML carries the whole thing twice over.

We read it from the og:description meta, which holds the tweet exactly as the
existing rows store it — leading reply mentions, newlines, t.co links, emoji —
wrapped in curly quotes:

    <meta property="og:description" content="“Can't wait to spend my time ...”">

Falling back, for the odd snapshot with no og:description, to rebuilding the
text from the `js-original-tweet` body (scoped so replies below can't leak in):

  * `<img class="Emoji" alt="🔥">`     -> the alt character
  * mention/hashtag links             -> their visible text (@user, #tag)
  * `data-pre-embedded` media link    -> dropped (media renders separately)
  * other t.co links                  -> the t.co URL from href
  * "Replying to @a @b" context       -> prefixed, matching the existing rows

Extracted text is cached in posts/text_scrape_cache.json so reruns are cheap.

Usage:
    python3 scripts/rescrape_text.py [--limit N] [--workers N] [--write]

Without --write it only prints a report and dumps the proposed diffs to
posts/text_scrape_diff.json (dry run).
"""

from __future__ import annotations

import argparse
import html
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
CACHE = os.path.join(REPO, "posts", "text_scrape_cache.json")
DIFF = os.path.join(REPO, "posts", "text_scrape_diff.json")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

OG_RE = re.compile(r'<meta property="og:description" content="(.*?)">', re.S)
ORIGINAL_RE = re.compile(r"js-original-tweet.*?(?=js-original-tweet|$)", re.S)
TEXT_RE = re.compile(
    r'<p class="[^"]*js-tweet-text[^"]*"[^>]*>(.*?)</p>', re.S
)
REPLY_CTX_RE = re.compile(r"ReplyingToContextBelowAuthor.*?</div>", re.S)
REPLY_USER_RE = re.compile(r"@<b>([^<]+)</b>")
IMG_RE = re.compile(r"<img[^>]*\balt=\"([^\"]*)\"[^>]*>")
A_RE = re.compile(r"<a\s([^>]*)>(.*?)</a>", re.S)
HREF_RE = re.compile(r'href="([^"]*)"')
WAYBACK_RE = re.compile(r"^https?://web\.archive\.org/web/\d+(?:im_)?/")
BR_RE = re.compile(r"<br\s*/?>")
TAG_RE = re.compile(r"<[^>]+>")


GONE = "__gone__"  # capture is indexed but not replayable — never coming back


def fetch(url: str, retries: int = 6) -> str | None:
    """GET url with exponential backoff.

    Returns GONE when the archive answers 404/410 (permanent — 49 of these
    captures are indexed by CDX but 404 on replay), None when we simply could
    not get through (archive.org refuses connections under load). The caller
    must not treat the second as permanent, or one throttled run writes off
    posts that are perfectly recoverable on the next.
    """
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": UA})
            with urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except HTTPError as e:
            if e.code in (404, 410):
                return GONE
            if attempt == retries - 1:
                return None
            time.sleep(min(60, 3 * 2 ** attempt) + random.uniform(0, 1))
        except (URLError, TimeoutError, OSError):
            if attempt == retries - 1:
                return None
            time.sleep(min(60, 3 * 2 ** attempt) + random.uniform(0, 1))
    return None


def _anchor(attrs: str, inner: str) -> str:
    """Render one <a> from the tweet body back to plain text."""
    if "data-pre-embedded" in attrs or "u-hidden" in attrs:
        return ""  # the pic.twitter.com link for attached media
    if "twitter-timeline-link" in attrs:
        href = HREF_RE.search(attrs)
        if href:
            return WAYBACK_RE.sub("", href.group(1))
    return TAG_RE.sub("", inner)  # @mention, #hashtag, $cashtag


def untwitter(text: str) -> str:
    """Undo Twitter's own escaping, which survives one round of unescaping.

    Twitter stored `<`, `>` and `&` escaped inside the tweet text itself, so the
    page carries `&amp;lt;3` — unescaping the markup once leaves `&lt;3`, and
    "Coke &gt; Pepsi" ends up on the page. Only these three ever appear.
    """
    return (text.replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&"))


def parse_text(page: str) -> str | None:
    """Return the original tweet's full text, or None if the page has none."""
    og = OG_RE.search(page)
    if og:
        text = html.unescape(og.group(1)).strip()
        # Twitter wraps the description in one pair of curly quotes. Strip that
        # pair only — .strip("“”") would also eat a tweet's own opening or
        # closing curly quote.
        if text.startswith("“") and text.endswith("”"):
            text = text[1:-1]
        if text:
            return untwitter(text)
    body = parse_body(page)
    return untwitter(body) if body else body


def parse_body(page: str) -> str | None:
    """Rebuild the text from the rendered tweet body (og:description fallback)."""
    block = ORIGINAL_RE.search(page)
    if not block:
        return None
    block = block.group(0)

    body = TEXT_RE.search(block)
    if not body:
        return None
    out = body.group(1)
    out = IMG_RE.sub(lambda m: m.group(1), out)
    out = A_RE.sub(lambda m: _anchor(m.group(1), m.group(2)), out)
    out = BR_RE.sub("\n", out)
    out = TAG_RE.sub("", out)
    out = html.unescape(out).strip()

    ctx = REPLY_CTX_RE.search(block)
    if ctx:
        # Self-replies list the account itself; the stored texts never do.
        users = [u for u in REPLY_USER_RE.findall(ctx.group(0))
                 if u.lower() != "simpsonsops"]
        if users:
            prefix = " ".join("@" + u for u in users)
            out = f"{prefix} {out}".strip()
    return out


def load_cache() -> dict[str, str]:
    if os.path.exists(CACHE):
        return json.load(open(CACHE))
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
                    help="process at most N uncached posts (0 = all)")
    ap.add_argument("--workers", type=int, default=4,
                    help="concurrent fetches; keep low, archive.org throttles")
    ap.add_argument("--write", action="store_true",
                    help="apply the re-extracted text to statuses.json")
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

    dead: list[str] = []
    throttled: list[str] = []

    def work(p: dict) -> tuple[str, str | None]:
        page = fetch(p["snapshot_url"])
        if page is None or page is GONE:
            return p["tweet_id"], page
        return p["tweet_id"], parse_text(page)

    if todo:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            for i, (tid, text) in enumerate(ex.map(work, todo), 1):
                if text is None:
                    # Could not get through. Leave it out of the cache so the
                    # next run retries it — do not write it off.
                    throttled.append(tid)
                elif text is GONE or not text:
                    # Permanently unusable: cache the null so reruns skip it
                    # instead of burning minutes of backoff on a dead capture.
                    dead.append(tid)
                    cache[tid] = None
                else:
                    cache[tid] = text
                if i % 25 == 0 or i == len(todo):
                    print(f"  fetched {i}/{len(todo)}", file=sys.stderr)
                    write_json(CACHE, cache)
        write_json(CACHE, cache)
        print(f"wrote cache      : {CACHE}")

    changed, extended, identical = [], 0, 0
    unusable = sum(1 for v in cache.values() if not v)
    for p in posts:
        new = cache.get(p["tweet_id"])
        if not new:
            continue
        old = p.get("text", "")
        if new == old:
            identical += 1
            continue
        if new.startswith(old) and old:
            extended += 1
        changed.append({"tweet_id": p["tweet_id"], "old": old, "new": new})

    print(f"parsed           : {identical + len(changed)}")
    print(f"dead captures    : {len(dead)} this run, {unusable} total")
    print(f"couldn't fetch   : {len(throttled)} (left uncached; rerun retries)")
    print(f"unchanged        : {identical}")
    print(f"changed          : {len(changed)}")
    print(f"  of which truncation-only fixes: {extended}")

    if args.write:
        regressed = 0
        for p in posts:
            new = cache.get(p["tweet_id"])
            if not new:
                continue
            # Never trade a longer stored text for a shorter scraped one. The
            # whole point of this script is that the stored text was truncated;
            # a parser change that starts returning less is a bug, not an
            # update, and this is the only copy of the archive.
            old = p.get("text", "")
            if len(new) < len(old) and not old.startswith(new):
                regressed += 1
                continue
            p["text"] = new
        write_json(STATUSES, posts)
        print(f"wrote            : {STATUSES}")
        if regressed:
            print(f"kept existing    : {regressed} (scraped text was shorter)")
    else:
        json.dump(changed, open(DIFF, "w"), ensure_ascii=False, indent=2)
        print(f"wrote diff       : {DIFF}")
        print("\ndry run; pass --write to apply")
    return 0


def selftest() -> int:
    """Parser checks over literal snapshot fragments. No network."""
    og = ('<meta property="og:description" content="'
          '“Can&#39;t wait to spend my time &amp;lt;debugging&amp;gt; this.”">')
    assert parse_text(og) == "Can't wait to spend my time <debugging> this.", \
        parse_text(og)

    # A tweet whose own text ends in a curly quote keeps it.
    quoted = ('<meta property="og:description" content="'
              '“He said “it works””">')
    assert parse_text(quoted) == "He said “it works”", parse_text(quoted)

    assert untwitter("Coke &gt; Pepsi &amp;&lt;3") == "Coke > Pepsi &<3"

    body = (
        'js-original-tweet'
        '<div class="ReplyingToContextBelowAuthor" data-aria-label-part>'
        'Replying to <a class="pretty-link"><span class="username">'
        '@<b>terrajobst</b></span></a></div>'
        '<p class="TweetTextSize js-tweet-text tweet-text">Bob isn&#39;t bad '
        '<img class="Emoji" alt="🙄">'
        '<a href="https://web.archive.org/web/20200706013859/https://t.co/xY" '
        'class="twitter-timeline-link u-hidden" data-pre-embedded="true">'
        'pic.twitter.com/xY</a></p>'
    )
    # Media link dropped, emoji from alt, reply mention prefixed.
    assert parse_body(body) == "@terrajobst Bob isn't bad 🙄", parse_body(body)

    # A real link keeps its t.co URL, with the wayback prefix stripped.
    linked = (
        'js-original-tweet'
        '<p class="TweetTextSize js-tweet-text tweet-text">see '
        '<a href="https://web.archive.org/web/20200706013859/https://t.co/aB" '
        'class="twitter-timeline-link">t.co/aB</a></p>'
    )
    assert parse_body(linked) == "see https://t.co/aB", parse_body(linked)

    print("rescrape_text selftest ok")
    return 0


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        raise SystemExit(selftest())
    raise SystemExit(main())
