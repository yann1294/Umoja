import type { MetadataRoute } from "next";

import { publicIndexingEnabled, releaseRobots } from "@/lib/config/release-security";

export default function robots(): MetadataRoute.Robots {
  return releaseRobots(publicIndexingEnabled());
}
