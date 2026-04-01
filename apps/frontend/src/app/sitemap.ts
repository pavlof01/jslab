import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://jslab.su/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://jslab.su/playground",
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://jslab.su/abstract-functions-visualizer",
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
