import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTweet, loadTweets } from "@/lib/tweets";
import { mediaUrl } from "@/lib/blob";
import LeftNav from "@/app/components/LeftNav";
import Tweet from "@/app/components/Tweet";
import ShareDelegate from "@/app/components/ShareDelegate";
import MediaLightbox from "@/app/components/MediaLightbox";
import ThemeToggle from "@/app/components/ThemeToggle";
import { BackArrow, ShareIcon } from "@/app/components/icons";

type Params = { id: string };

export async function generateStaticParams(): Promise<Params[]> {
  const tweets = await loadTweets();
  return tweets.map((t) => ({ id: t.tweet_id }));
}

function summarize(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "A post from Simpsons Against DevOps (@SimpsonsOps).";
  return clean.length > 200 ? `${clean.slice(0, 197)}...` : clean;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const tweet = await getTweet(id);
  if (!tweet) return { title: "Post not found / Simpsons Against DevOps" };

  const description = summarize(tweet.text);
  const title = `Simpsons Against DevOps on X: "${summarize(tweet.text)}"`;
  const image = tweet.media[0] ? mediaUrl(tweet.media[0]) : undefined;

  return {
    title,
    description,
    openGraph: {
      title: "Simpsons Against DevOps (@SimpsonsOps)",
      description,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: "Simpsons Against DevOps (@SimpsonsOps)",
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function StatusPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const tweet = await getTweet(id);
  if (!tweet) notFound();

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
            <span className="top-bar-title">Post</span>
          </div>
          <div className="top-bar-spacer" />
          <ThemeToggle />
        </div>

        <Tweet tweet={tweet} />

        <div className="permalink-actions">
          <button
            type="button"
            className="copy-link-btn"
            data-share-id={tweet.tweet_id}
          >
            <ShareIcon width={18} height={18} />
            Copy link to this post
          </button>
        </div>
      </main>

      <aside className="col-right" aria-label="Search">
        <div className="search-box">
          <Link href="/" className="back-to-all">
            Back to all posts
          </Link>
        </div>
      </aside>
      <ShareDelegate />
      <MediaLightbox />
    </div>
  );
}
