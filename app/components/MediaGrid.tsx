import { mediaUrl } from "@/lib/blob";

export default function MediaGrid({ media }: { media: string[] }) {
  if (!media || media.length === 0) return null;

  const items = media.slice(0, 4);

  return (
    <div className={`media-grid count-${items.length}`}>
      {items.map((file, i) => {
        const url = mediaUrl(file);
        return (
          <button
            type="button"
            className="media-cell"
            data-media-src={url}
            aria-label="Open image"
            key={`${file}-${i}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" loading="lazy" decoding="async" />
          </button>
        );
      })}
    </div>
  );
}
