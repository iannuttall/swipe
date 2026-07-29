import type { AlpineRuntime } from "./types";

type ToolSearchItem = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  icon?: string;
};

type ToolDirectoryConfig = {
  manifestUrl: string;
};

type DirectoryStatus = "loading" | "ready" | "error";

export function registerToolDirectory(Alpine: AlpineRuntime) {
  Alpine.data(
    "toolDirectorySearch",
    (config: ToolDirectoryConfig = { manifestUrl: "/tools/index.json" }) => ({
      query: "",
      items: [] as ToolSearchItem[],
      status: "loading" as DirectoryStatus,

      async init() {
        try {
          const response = await fetch(config.manifestUrl, {
            headers: { accept: "application/json" },
          });
          if (!response.ok) throw new Error("Tool index did not load");
          this.items = (await response.json()) as ToolSearchItem[];
          this.status = "ready";
        } catch {
          this.status = "error";
        }
      },

      get results() {
        const words = String(this.query)
          .trim()
          .toLocaleLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        if (words.length === 0) return [];

        return this.items.filter((tool) => {
          const haystack = [
            tool.name,
            tool.tagline,
            tool.description,
            tool.category,
            ...tool.tags,
          ]
            .join(" ")
            .toLocaleLowerCase();
          return words.every((word) => haystack.includes(word));
        });
      },

      initials(name: string) {
        return name
          .split(/[\s._-]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase();
      },
    }),
  );
}
