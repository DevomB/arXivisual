import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://arxivisual.org",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      // The gallery gains a card whenever a paper finishes processing.
      url: "https://arxivisual.org/explore",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
