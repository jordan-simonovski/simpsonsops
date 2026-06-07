import { promises as fs } from "fs";
import path from "path";

export interface ReplyTo {
  tweet_id: string;
  username: string;
  author_display_name?: string | null;
  posted_at?: string | null;
  text?: string | null;
  snapshot_url?: string | null;
}

export interface Tweet {
  tweet_id: string;
  url: string;
  posted_at: string;
  text: string;
  media: string[];
  snapshot_url: string;
  has_video?: boolean;
  video?: string;
  reply_to?: ReplyTo;
}

let cache: Tweet[] | null = null;

export async function loadTweets(): Promise<Tweet[]> {
  if (cache) return cache;

  const file = path.join(process.cwd(), "posts", "statuses.json");
  const raw = await fs.readFile(file, "utf8");
  const tweets = JSON.parse(raw) as Tweet[];

  tweets.sort(
    (a, b) =>
      new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
  );

  cache = tweets;
  return tweets;
}

export async function getTweet(id: string): Promise<Tweet | undefined> {
  const tweets = await loadTweets();
  return tweets.find((t) => t.tweet_id === id);
}
