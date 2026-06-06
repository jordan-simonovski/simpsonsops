export const BLOB_BASE =
  process.env.NEXT_PUBLIC_BLOB_BASE_URL ??
  "https://i6splhvvlgui0aoc.public.blob.vercel-storage.com";

export function mediaUrl(filename: string): string {
  return `${BLOB_BASE}/${encodeURIComponent(filename)}`;
}
