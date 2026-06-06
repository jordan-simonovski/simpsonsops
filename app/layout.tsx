import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simpsons Against DevOps (@SimpsonsOps)",
  description:
    "Simpsons Against DevOps | DMs Open | Send Memes | New memes posted once a day-ish. An archive of the @SimpsonsOps meme account.",
};

const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
