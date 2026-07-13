import type { MetadataRoute } from "next";
import {
  collectSitemapShard,
  isSitemapShardId,
  SITEMAP_SHARD_IDS,
} from "@/lib/sitemap-urls";

export async function generateSitemaps() {
  return SITEMAP_SHARD_IDS.map((id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  if (!isSitemapShardId(id)) return [];
  return collectSitemapShard(id);
}
