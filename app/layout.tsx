import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://simpsonsops.dev";

const description =
  "The complete archive of every Simpsons Against DevOps (@SimpsonsOps) tweet. Browse all the memes, replies, and shitposts in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Simpsons Against DevOps (@SimpsonsOps)",
  description,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Simpsons Against DevOps (@SimpsonsOps)",
    description,
    images: [
      {
        url: "/simpsonsops-pp.jpg",
        width: 400,
        height: 400,
        alt: "Simpsons Against DevOps",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Simpsons Against DevOps (@SimpsonsOps)",
    description,
    images: ["/simpsonsops-pp.jpg"],
  },
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
