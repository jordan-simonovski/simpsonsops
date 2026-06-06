import type { ReplyTo } from "@/lib/tweets";
import { linkify } from "@/lib/linkify";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function originalUrl(reply: ReplyTo): string {
  return (
    reply.snapshot_url ??
    `https://twitter.com/${reply.username}/status/${reply.tweet_id}`
  );
}

export default function QuotedTweet({ reply }: { reply: ReplyTo }) {
  if (!reply.text) return null;

  const name = reply.author_display_name || reply.username;
  const date = reply.posted_at ? formatShortDate(reply.posted_at) : "";

  return (
    <div className="quote-card">
      <div className="quote-head">
        <span className="quote-avatar" />
        <span className="quote-name">{name}</span>
        <span className="quote-handle">@{reply.username}</span>
        {date ? (
          <>
            <span className="quote-handle">·</span>
            <a
              className="quote-date"
              href={originalUrl(reply)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {date}
            </a>
          </>
        ) : null}
      </div>
      <p className="quote-text">{linkify(reply.text)}</p>
    </div>
  );
}
