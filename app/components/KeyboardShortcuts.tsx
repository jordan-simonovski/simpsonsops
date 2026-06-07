"use client";

import { useEffect } from "react";

// One keydown listener for the whole timeline, in keeping with the delegated
// listener style used elsewhere. j/k step through currently-visible posts,
// r jumps to a random post, "/" focuses search. Typing in an input is never
// hijacked (except nothing here binds Escape; the lightbox owns that).
const VISIBLE_SELECTOR =
  ".tweet:not(.hidden-by-search):not(.hidden-by-reply):not(.hidden-by-quote):not(.hidden-by-tag)";

export default function KeyboardShortcuts() {
  useEffect(() => {
    let index = -1;

    function visibleTweets(): HTMLElement[] {
      return Array.from(document.querySelectorAll<HTMLElement>(VISIBLE_SELECTOR));
    }

    function focus(tweets: HTMLElement[], i: number) {
      tweets.forEach((t) => t.classList.remove("kbd-active"));
      const el = tweets[i];
      if (!el) return;
      el.classList.add("kbd-active");
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    function isTyping(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      switch (e.key) {
        case "j":
        case "k": {
          const tweets = visibleTweets();
          if (tweets.length === 0) return;
          e.preventDefault();
          if (e.key === "j") index = Math.min(index + 1, tweets.length - 1);
          else index = Math.max(index - 1, 0);
          focus(tweets, index);
          break;
        }
        case "r":
          e.preventDefault();
          window.location.href = "/random";
          break;
        case "/": {
          const input = document.querySelector<HTMLInputElement>(".search-input");
          if (input) {
            e.preventDefault();
            input.focus();
          }
          break;
        }
        case "?": {
          const help = document.querySelector<HTMLElement>(".kbd-help");
          if (help) {
            e.preventDefault();
            help.hidden = !help.hidden;
          }
          break;
        }
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="kbd-help" hidden role="dialog" aria-label="Keyboard shortcuts">
      <strong>Shortcuts</strong>
      <ul>
        <li><kbd>j</kbd> / <kbd>k</kbd> next / previous post</li>
        <li><kbd>r</kbd> random post</li>
        <li><kbd>/</kbd> search</li>
        <li><kbd>?</kbd> toggle this help</li>
      </ul>
    </div>
  );
}
