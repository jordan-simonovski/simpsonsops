import type { Metadata } from "next";
import Link from "next/link";
import { loadTweets } from "@/lib/tweets";
import { tagCounts } from "@/lib/tags";
import LeftNav from "@/app/components/LeftNav";
import ThemeToggle from "@/app/components/ThemeToggle";
import { BackArrow } from "@/app/components/icons";

export const metadata: Metadata = {
  title: "Stats / Simpsons Against DevOps",
  description: "By-the-numbers breakdown of the @SimpsonsOps meme archive.",
};

const STOPWORDS = new Set([
  "the", "and", "you", "your", "for", "are", "but", "not", "all", "can", "her",
  "was", "one", "our", "out", "his", "has", "had", "how", "who", "its", "did",
  "get", "got", "let", "she", "him", "them", "they", "their", "with", "this",
  "that", "from", "have", "what", "when", "will", "just", "like", "your", "yours",
  "about", "into", "than", "then", "them", "were", "been", "being", "some",
  "such", "only", "over", "also", "back", "after", "where", "which", "would",
  "could", "should", "there", "these", "those", "here", "your", "very", "much",
  "more", "most", "them", "every", "still", "even", "make", "made", "want",
  "going", "gonna", "wanna", "dont", "doesnt", "didnt", "cant", "wont", "isnt",
  "thats", "its", "ive", "youre", "theyre", "were", "weve", "lets", "yeah",
  "https", "http", "com", "www", "twitter", "amp", "rt",
]);

function topWords(texts: string[], limit: number): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
    for (const raw of words) {
      const word = raw.replace(/'/g, "");
      if (word.length < 3 || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StatsPage() {
  const tweets = await loadTweets();

  const withMedia = tweets.filter((t) => t.media.length > 0).length;
  const withVideo = tweets.filter((t) => t.video || t.has_video).length;
  const replies = tweets.filter((t) => t.reply_to && !t.reply_to.text).length;
  const quotes = tweets.filter((t) => t.reply_to && t.reply_to.text).length;
  const mediaFiles = tweets.reduce((sum, t) => sum + t.media.length, 0);

  const dated = tweets
    .map((t) => new Date(t.posted_at))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const first = dated[0];
  const latest = dated[dated.length - 1];

  const byYear = new Map<number, number>();
  const byDay = new Array(7).fill(0);
  for (const d of dated) {
    byYear.set(d.getUTCFullYear(), (byYear.get(d.getUTCFullYear()) ?? 0) + 1);
    byDay[d.getUTCDay()] += 1;
  }
  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0]);
  const maxYear = Math.max(1, ...years.map(([, n]) => n));
  const maxDay = Math.max(1, ...byDay);

  const words = topWords(tweets.map((t) => t.text ?? ""), 20);
  const maxWord = Math.max(1, ...words.map((w) => w.count));
  const tags = tagCounts(tweets);
  const maxTag = Math.max(1, ...tags.map((t) => t.count));

  const fmt = (n: number) => n.toLocaleString("en-US");
  const fmtDate = (d?: Date) =>
    d
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

  return (
    <div className="app">
      <div className="col-left">
        <LeftNav />
      </div>

      <main className="col-main">
        <div className="top-bar">
          <Link className="back" href="/" aria-label="Back to profile">
            <BackArrow width={20} height={20} />
          </Link>
          <div className="top-bar-titles">
            <span className="top-bar-title">Stats</span>
            <span className="top-bar-sub">{fmt(tweets.length)} posts</span>
          </div>
          <div className="top-bar-spacer" />
          <ThemeToggle />
        </div>

        <div className="stats-grid">
          <div className="stat-card"><span className="stat-num">{fmt(tweets.length)}</span><span className="stat-label">Total posts</span></div>
          <div className="stat-card"><span className="stat-num">{fmt(withMedia)}</span><span className="stat-label">With images</span></div>
          <div className="stat-card"><span className="stat-num">{fmt(withVideo)}</span><span className="stat-label">With video</span></div>
          <div className="stat-card"><span className="stat-num">{fmt(mediaFiles)}</span><span className="stat-label">Media files</span></div>
          <div className="stat-card"><span className="stat-num">{fmt(replies)}</span><span className="stat-label">Replies</span></div>
          <div className="stat-card"><span className="stat-num">{fmt(quotes)}</span><span className="stat-label">Quotes</span></div>
        </div>

        <div className="stats-range">
          First post {fmtDate(first)} &middot; Latest {fmtDate(latest)}
        </div>

        <section className="stats-section">
          <h2 className="stats-h">Posts per year</h2>
          <div className="bars">
            {years.map(([year, n]) => (
              <div className="bar-row" key={year}>
                <span className="bar-key">{year}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(n / maxYear) * 100}%` }} />
                </span>
                <span className="bar-val">{fmt(n)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="stats-section">
          <h2 className="stats-h">By day of week</h2>
          <div className="bars">
            {byDay.map((n, i) => (
              <div className="bar-row" key={DAY_NAMES[i]}>
                <span className="bar-key">{DAY_NAMES[i]}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(n / maxDay) * 100}%` }} />
                </span>
                <span className="bar-val">{fmt(n)}</span>
              </div>
            ))}
          </div>
        </section>

        {tags.length > 0 ? (
          <section className="stats-section">
            <h2 className="stats-h">Top topics</h2>
            <div className="bars">
              {tags.map(({ label, count }) => (
                <div className="bar-row" key={label}>
                  <span className="bar-key">{label}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${(count / maxTag) * 100}%` }} />
                  </span>
                  <span className="bar-val">{fmt(count)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="stats-section">
          <h2 className="stats-h">Most-used words</h2>
          <div className="wordcloud">
            {words.map(({ word, count }) => (
              <span
                key={word}
                className="word"
                style={{ fontSize: `${0.85 + (count / maxWord) * 1.6}rem` }}
                title={`${count} uses`}
              >
                {word}
              </span>
            ))}
          </div>
        </section>
      </main>

      <aside className="col-right" aria-label="Navigation">
        <div className="search-box">
          <Link href="/" className="back-to-all">Back to all posts</Link>
        </div>
      </aside>
    </div>
  );
}
