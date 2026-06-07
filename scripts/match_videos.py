#!/usr/bin/env python3
"""Map exported Twitter mp4 files to posts by embedded creation_time.

Twitter stamps real (transcoded) videos with an mp4 `creation_time` that equals
the upload moment, so it matches a post's `posted_at` to within seconds. We do a
global nearest-timestamp join with a tight threshold.

Animated GIFs (Twitter serves them as silent mp4, handler "Twitter v2") carry no
`creation_time` and cannot be placed by metadata. They are reported as unmatched.

Usage:
    python3 scripts/match_videos.py [--media-dir DIR] [--write]

Without --write it only prints a report (dry run).
"""

from __future__ import annotations

import argparse
import datetime as dt
import glob
import json
import os
import subprocess
import sys

# Anything beyond this is noise (quoted/other-account videos). The real matches
# cluster under ~250s with a clean gap before the next candidate (~1000s+).
MATCH_THRESHOLD_S = 600

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUSES = os.path.join(REPO, "posts", "statuses.json")
UNMATCHED = os.path.join(REPO, "posts", "unmatched_media.json")
DEFAULT_MEDIA = os.path.expanduser("~/dev/twitter-media-export/output")


def parse_ts(s: str) -> dt.datetime:
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def creation_time(path: str) -> str | None:
    """Return the mp4 container creation_time tag, or None if absent."""
    # "./" guards against filenames starting with '-' being read as flags.
    out = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_entries", "format_tags=creation_time", path,
        ],
        capture_output=True, text=True,
    ).stdout
    try:
        return json.loads(out)["format"]["tags"].get("creation_time")
    except (ValueError, KeyError):
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--media-dir", default=DEFAULT_MEDIA)
    ap.add_argument("--write", action="store_true",
                    help="apply matches to statuses.json")
    args = ap.parse_args()

    mp4s = sorted(glob.glob(os.path.join(args.media_dir, "*.mp4")))
    if not mp4s:
        print(f"no mp4s under {args.media_dir}", file=sys.stderr)
        return 1

    videos: dict[str, dt.datetime] = {}  # filename -> creation_time
    gifs: list[str] = []                 # no creation_time
    for path in mp4s:
        name = os.path.basename(path)
        ct = creation_time("./" + os.path.relpath(path))
        if ct:
            videos[name] = parse_ts(ct)
        else:
            gifs.append(name)

    posts = json.load(open(STATUSES))
    by_id = {p["tweet_id"]: p for p in posts}

    # Global nearest, unique on both sides: sort all candidate pairs by delta.
    pairs = sorted(
        (abs((parse_ts(p["posted_at"]) - t).total_seconds()), name, p["tweet_id"])
        for name, t in videos.items()
        for p in posts
    )
    used_file: set[str] = set()
    used_post: set[str] = set()
    matches: dict[str, tuple[str, float]] = {}  # filename -> (tweet_id, delta)
    for delta, name, tid in pairs:
        if delta > MATCH_THRESHOLD_S:
            break
        if name in used_file or tid in used_post:
            continue
        used_file.add(name)
        used_post.add(tid)
        matches[name] = (tid, delta)

    unmatched_videos = sorted(set(videos) - used_file)

    print(f"mp4 files          : {len(mp4s)}")
    print(f"  real videos      : {len(videos)} (have creation_time)")
    print(f"  gifs (no ts)     : {len(gifs)}")
    print(f"matched to posts   : {len(matches)}")
    if matches:
        ds = sorted(d for _, d in matches.values())
        print(f"  delta median/max : {ds[len(ds)//2]:.1f}s / {ds[-1]:.1f}s")
    print(f"unmatched videos   : {len(unmatched_videos)} (no post within "
          f"{MATCH_THRESHOLD_S}s -> quoted/other-account)")
    print(f"unmatched gifs     : {len(gifs)}")

    if args.write:
        for name, (tid, _) in matches.items():
            p = by_id[tid]
            p["video"] = name
            p["has_video"] = True
        json.dump(posts, open(STATUSES, "w"), ensure_ascii=False, indent=2)
        json.dump(
            {
                "gifs": gifs,
                "unmatched_videos": unmatched_videos,
                "threshold_seconds": MATCH_THRESHOLD_S,
            },
            open(UNMATCHED, "w"),
            ensure_ascii=False,
            indent=2,
        )
        print(f"\nwrote {STATUSES}")
        print(f"wrote {UNMATCHED}")
    else:
        print("\ndry run; pass --write to apply")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
