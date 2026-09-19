import type { Metadata } from "next";

/**
 * Server half of /explore. `page.tsx` is a "use client" module and cannot
 * export metadata, so without this file the gallery inherited the root
 * layout's wholesale — including the homepage as its canonical URL, which
 * tells search engines /explore is a duplicate of `/`.
 *
 * Relative URLs resolve against the root layout's `metadataBase`
 * (https://arxivisual.org), so the canonical renders as an absolute URL.
 */
const TITLE = "Explore Visualized Papers";
const DESCRIPTION =
  "Browse arXiv papers that have already been turned into interactive scrollytelling explainers with AI-generated Manim animations. Pick one and dive in.";

export const metadata: Metadata = {
  // The root layout's `%s · arXivisual` template appends the site name.
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/explore" },
  // Segment metadata replaces these objects wholesale (Next merges per
  // top-level key), so the site/locale/image fields are restated — otherwise
  // og:url would keep pointing at the homepage.
  openGraph: {
    type: "website",
    url: "/explore",
    siteName: "arXivisual",
    locale: "en_US",
    title: `${TITLE} · arXivisual`,
    description: DESCRIPTION,
    images: [
      {
        url: "/landing.jpeg",
        width: 1200,
        height: 630,
        alt: "arXivisual — arXiv papers transformed into animated visual explanations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@armaangupt0",
    creator: "@armaangupt0",
    title: `${TITLE} · arXivisual`,
    description: DESCRIPTION,
    images: ["/landing.jpeg"],
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
