import { getCollection, type CollectionEntry } from "astro:content";

export const TOOLS_PER_PAGE = 12;

export type ToolSearchItem = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  icon?: string;
};

export async function getVisibleTools(): Promise<CollectionEntry<"tools">[]> {
  const tools = (await getCollection("tools")) as CollectionEntry<"tools">[];

  return tools
    .filter((tool) => import.meta.env.DEV || tool.data.draft !== true)
    .sort((a, b) => {
      const checked =
        b.data.lastChecked.getTime() - a.data.lastChecked.getTime();
      return checked || a.data.name.localeCompare(b.data.name);
    });
}

export function paginateTools(
  tools: CollectionEntry<"tools">[],
  page: number,
): CollectionEntry<"tools">[] {
  const start = (page - 1) * TOOLS_PER_PAGE;
  return tools.slice(start, start + TOOLS_PER_PAGE);
}

export function toolPageCount(toolCount: number): number {
  return Math.max(1, Math.ceil(toolCount / TOOLS_PER_PAGE));
}

export function toolInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function toolSearchItem(
  tool: CollectionEntry<"tools">,
): ToolSearchItem {
  return {
    slug: tool.id,
    name: tool.data.name,
    tagline: tool.data.tagline,
    description: tool.data.description,
    category: tool.data.category,
    tags: tool.data.tags ?? [],
    ...(tool.data.icon ? { icon: tool.data.icon } : {}),
  };
}

export function formatToolDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
