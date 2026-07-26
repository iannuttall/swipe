import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Issues for public routes: sent/published only, newest first. Dev builds
 * include drafts so an issue can be previewed at /issues/<slug> before send.
 */
export async function getVisibleIssues(): Promise<CollectionEntry<"issues">[]> {
  const issues = (await getCollection("issues")) as CollectionEntry<"issues">[];

  return issues
    .filter((issue) => import.meta.env.DEV || issue.data.draft !== true)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/**
 * Whole-issue reading time in minutes. Component and legacy fence lines are
 * chrome, not prose; everything else — including code — counts as words.
 */
export function issueReadingMinutes(body: string): number {
  const words = body
    .split(/\r?\n/)
    .filter((line) => !/^(:::|<\/?[A-Z][A-Za-z0-9]*\b)/.test(line.trim()))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export function formatIssueDate(date: Date) {
  return dateFormatter.format(date);
}
