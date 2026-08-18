import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";
import { tools } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...tools.map((tool) => ({
      url: siteUrl(tool.href),
      changeFrequency: "weekly" as const,
      priority: tool.priority,
    })),
  ];
}
