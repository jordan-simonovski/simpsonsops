import React from "react";

// Matches https URLs or @mentions. Mentions require a non-word char (or start)
// before the @ so emails don't get mangled.
const TOKEN = /(https?:\/\/[^\s]+)|(^|[^\w@])(@\w{1,15})/g;

export function linkify(text: string): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(text)) !== null) {
    const [full, url, lead, mention] = match;
    const start = match.index;

    if (url) {
      if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
      nodes.push(
        React.createElement(
          "a",
          { key: key++, href: url, target: "_blank", rel: "noopener noreferrer" },
          url
        )
      );
      lastIndex = start + full.length;
    } else if (mention) {
      const mentionStart = start + (lead ? lead.length : 0);
      if (mentionStart > lastIndex) {
        nodes.push(text.slice(lastIndex, mentionStart));
      }
      nodes.push(
        React.createElement(
          "a",
          {
            key: key++,
            href: `https://twitter.com/${mention.slice(1)}`,
            target: "_blank",
            rel: "noopener noreferrer",
          },
          mention
        )
      );
      lastIndex = start + full.length;
    }
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
