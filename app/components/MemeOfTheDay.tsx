import type { Tweet as TweetType } from "@/lib/tweets";
import Tweet from "./Tweet";

// Deterministic daily pick: same post for everyone on a given UTC day, no
// storage needed. The page uses ISR (see revalidate in page.tsx) so the
// rendered pick rolls over without a redeploy. Pick only from posts with an
// image or playable video — it is "meme of the day", not "reply of the day".
function dayNumberUTC(now: Date): number {
  return Math.floor(now.getTime() / 86_400_000);
}

export default function MemeOfTheDay({ tweets }: { tweets: TweetType[] }) {
  const pool = tweets.filter((t) => t.media.length > 0 || t.video);
  if (pool.length === 0) return null;

  const pick = pool[dayNumberUTC(new Date()) % pool.length];

  return (
    <section className="motd" aria-label="Meme of the day">
      <div className="motd-banner">
        <span className="motd-badge">★</span>
        Meme of the day
      </div>
      <Tweet tweet={pick} />
    </section>
  );
}
