export const siteName = "Swipe";
export const siteUrl = "https://swipe.md";
export const siteDescription = "The weekly newsletter that helps you learn AI by actually doing cool things with it.";
export const ogImageServiceUrl = "https://og.ian.is/";

export function toAbsoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export function toOgImageUrl(canonicalUrl: string) {
  const url = new URL(ogImageServiceUrl);
  url.searchParams.set("url", canonicalUrl);
  return url.toString();
}
