import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: siteUrl("/playground"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: siteUrl("/v8-pipeline"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: siteUrl("/type-conversion"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: siteUrl("/equality"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: siteUrl("/quiz"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: siteUrl("/v8-log"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];
}
