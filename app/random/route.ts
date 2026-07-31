import { NextResponse } from "next/server";
import { loadTweets } from "@/lib/tweets";

// Pick server-side so we don't ship every tweet id to the client. Must be
// dynamic: a cached/static response would always land on the same post.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Memes only — a random text-only reply is a dud landing page.
  const tweets = (await loadTweets()).filter(
    (t) => t.media.length > 0 || t.has_video
  );
  if (tweets.length === 0) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const pick = tweets[Math.floor(Math.random() * tweets.length)];
  return NextResponse.redirect(new URL(`/status/${pick.tweet_id}`, request.url));
}
