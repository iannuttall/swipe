export const siteName = "SWIPE.md";
export const siteUrl = "https://swipe.md";
export const siteDescription = "The weekly newsletter that helps you learn AI by actually doing cool things with it.";

export function toAbsoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
