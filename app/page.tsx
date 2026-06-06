import { loadTweets } from "@/lib/tweets";
import LeftNav from "./components/LeftNav";
import ProfileHeader from "./components/ProfileHeader";
import Tweet from "./components/Tweet";
import SearchBar from "./components/SearchBar";
import ShareDelegate from "./components/ShareDelegate";
import MediaLightbox from "./components/MediaLightbox";

export default async function Page() {
  const tweets = await loadTweets();

  return (
    <div className="app">
      <div className="col-left">
        <LeftNav />
      </div>

      <main className="col-main">
        <ProfileHeader postCount={tweets.length} />
        <p id="search-empty" className="search-empty" hidden>
          No posts match your search.
        </p>
        <section aria-label="Posts">
          {tweets.map((tweet) => (
            <Tweet key={tweet.tweet_id} tweet={tweet} />
          ))}
        </section>
      </main>

      <SearchBar />
      <ShareDelegate />
      <MediaLightbox />
    </div>
  );
}
