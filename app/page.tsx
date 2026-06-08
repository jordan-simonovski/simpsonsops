import { loadTweets } from "@/lib/tweets";
import { tagCounts } from "@/lib/tags";
import LeftNav from "./components/LeftNav";
import ProfileHeader from "./components/ProfileHeader";
import Timeline from "./components/Timeline";
import TagFilter from "./components/TagFilter";
import SearchBar from "./components/SearchBar";
import ShareDelegate from "./components/ShareDelegate";
import MediaLightbox from "./components/MediaLightbox";
import MemeOfTheDay from "./components/MemeOfTheDay";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import VideoAutoPause from "./components/VideoAutoPause";

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
        <ProfileHeader />
        <MemeOfTheDay tweets={tweets} />
        <TagFilter tags={tags} />
        <Timeline tweets={tweets} />
      </main>

      <SearchBar />
      <ShareDelegate />
      <MediaLightbox />
      <KeyboardShortcuts />
      <VideoAutoPause />
    </div>
  );
}
