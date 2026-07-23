export const siteName = "SWIPE.md";
export const siteUrl = "https://swipe.md";
export const siteDescription = "practical AI for code, marketing, and life - from Ian Nuttall.";

export function toAbsoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
