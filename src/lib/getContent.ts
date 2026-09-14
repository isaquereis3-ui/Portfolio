import rawOverrides from "@/data/content-overrides.json";

export type ContentOverrides = Record<string, string>;

export const contentOverrides: ContentOverrides = rawOverrides;

export function getContent(key: string, fallback: string): string {
  return contentOverrides[key] ?? fallback;
}

export function getLinkHref(linkKey: string, fallback: string): string {
  return contentOverrides[`link.${linkKey}`] ?? fallback;
}

export function getImageSrc(imageKey: string): string | undefined {
  return contentOverrides[`image.${imageKey}`];
}
