import type { Metadata } from "next";
import {
  absoluteUrl,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
} from "./site";

export const DEFAULT_OG_IMAGE = {
  url: absoluteUrl(OG_IMAGE_PATH),
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
  alt: OG_IMAGE_ALT,
};

const DEFAULT_TWITTER_IMAGES = [absoluteUrl(OG_IMAGE_PATH)];

/** OG/Twitter-превью для SEO-страниц — не затирает уже заданные images. */
export function withDefaultSocialPreview(metadata: Metadata): Metadata {
  const og = metadata.openGraph;
  const twitter = metadata.twitter;

  return {
    ...metadata,
    openGraph: og
      ? {
          ...og,
          images: og.images ?? [DEFAULT_OG_IMAGE],
        }
      : { images: [DEFAULT_OG_IMAGE] },
    twitter: {
      card: "summary_large_image",
      ...twitter,
      images:
        twitter && typeof twitter === "object" && "images" in twitter && twitter.images
          ? twitter.images
          : DEFAULT_TWITTER_IMAGES,
    },
  };
}
