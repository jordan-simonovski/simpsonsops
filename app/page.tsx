import { loadTweets } from "@/lib/tweets";
import { tagCounts } from "@/lib/tags";
import LeftNav from "./components/LeftNav";
import ProfileHeader from "./components/ProfileHeader";
import Tweet from "./components/Tweet";
import ResponseFilter from "./components/ResponseFilter";
import TagFilter from "./components/TagFilter";
import SearchBar from "./components/SearchBar";
import ShareDelegate from "./components/ShareDelegate";
import MediaLightbox from "./components/MediaLightbox";
import MemeOfTheDay from "./components/MemeOfTheDay";
import KeyboardShortcuts from "./components/KeyboardShortcuts";

// Re-render hourly so the date-seeded "meme of the day" rolls over without a
// redeploy. The archive itself is static, so this is the only moving part.
export const revalidate = 3600;

export default async function Page() {
  const tweets = await loadTweets();
  const tags = tagCounts(tweets);

  return (
    <div className="app">
      <div className="col-left">
        <LeftNav />
      </div>

      <main className="col-main">
        <ProfileHeader postCount={tweets.length} />
        <MemeOfTheDay tweets={tweets} />
        <ResponseFilter />
        <TagFilter tags={tags} />
        <p id="search-empty" className="search-empty" hidden>
          No posts match your search.
        </p>
        <section aria-label="Posts">
          {tweets.map((tweet) => (
            <Tweet key={tweet.tweet_id} tweet={tweet} filterable />
          ))}
        </section>
      </main>

      <SearchBar />
      <ShareDelegate />
      <MediaLightbox />
      <KeyboardShortcuts />
    </div>
  );
}
