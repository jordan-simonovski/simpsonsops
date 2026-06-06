import type { Tweet as TweetType } from "@/lib/tweets";
import { linkify } from "@/lib/linkify";
import { VerifiedBadge, VideoOffIcon, ShareIcon } from "./icons";
import MediaGrid from "./MediaGrid";
import QuotedTweet from "./QuotedTweet";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Tweet({ tweet }: { tweet: TweetType }) {
  const showReplyLine = tweet.reply_to && !tweet.reply_to.text;
  const showQuote = tweet.reply_to && tweet.reply_to.text;

  const searchText = [
    tweet.text,
    tweet.reply_to?.text ?? "",
    tweet.reply_to?.username ?? "",
    tweet.reply_to?.author_display_name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    <article className="tweet" data-search-text={searchText}>
      <img
        className="tweet-avatar"
        src="/simpsonsops-pp.jpg"
        alt="Simpsons Against DevOps"
      />
      <div className="tweet-main">
        <div className="tweet-head">
          <span className="tweet-name">Simpsons Against DevOps</span>
          <VerifiedBadge className="verified" width={16} height={16} />
          <span className="tweet-handle">@SimpsonsOps</span>
          <span className="tweet-dot">·</span>
          <a className="tweet-date" href={`/status/${tweet.tweet_id}`}>
            {formatDate(tweet.posted_at)}
          </a>
          <button
            type="button"
            className="share-btn"
            data-share-id={tweet.tweet_id}
            aria-label="Copy link to post"
            title="Copy link to post"
          >
            <ShareIcon />
          </button>
        </div>

        {showReplyLine ? (
          <div className="reply-line">
            Replying to{" "}
            <a
              href={`https://twitter.com/${tweet.reply_to!.username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{tweet.reply_to!.username}
            </a>
          </div>
        ) : null}

        {tweet.text ? (
          <p className="tweet-text">{linkify(tweet.text)}</p>
        ) : null}

        {tweet.media.length > 0 ? <MediaGrid media={tweet.media} /> : null}

        {tweet.has_video ? (
          <div className="video-placeholder">
            <VideoOffIcon />
            <span className="vp-text">Video unavailable</span>
          </div>
        ) : null}

        {showQuote ? <QuotedTweet reply={tweet.reply_to!} /> : null}
      </div>
    </article>
  );
}
