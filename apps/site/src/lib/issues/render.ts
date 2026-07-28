import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { rehypeCodeCopy } from "@/lib/markdown-code.mjs";
import {
  parseIssueSections,
  parseLinkItem,
  resolveIssueConditionals,
  type IssueLinkItem,
  type IssueSection,
} from "./parser";

// Email-only chrome; the site layout provides its own.
const skippedTypes = new Set(["header", "footer"]);

// Same default section titles the email template applies.
const defaultTitles: Record<string, string> = {
  sponsor: "Sponsor",
  links: "Links",
  classifieds: "Classifieds",
};

export interface IssueLinkItemView extends IssueLinkItem {
  descriptionHtml: string;
}

export interface IssueSectionView {
  type: string;
  attrs: Record<string, string>;
  title: string | undefined;
  bodyHtml: string;
  items: IssueLinkItemView[];
  itemsHtml: string[];
}

// Mirror of the email's Dense Discovery palette in @email/core
// issue-palette.ts: saturated square + light tint per named color. On the
// web the tint gets a dark-mode fallback derived from the square.
export const issueSectionPalette: Record<string, { square: string; tint: string }> = {
  gray: { square: "#313131", tint: "#F1F1F1" },
  yellow: { square: "#F1C755", tint: "#FAF4E5" },
  pink: { square: "#C74B9E", tint: "#FBF2F8" },
  green: { square: "#7CB663", tint: "#F1F6EF" },
  blue: { square: "#3175B9", tint: "#EAF2FA" },
  purple: { square: "#6D54A5", tint: "#F3F1F8" },
  teal: { square: "#29899E", tint: "#E8F5F7" },
  red: { square: "#DB5644", tint: "#FBF1F0" },
  orange: { square: "#E78931", tint: "#FAF4EF" },
  mint: { square: "#41A494", tint: "#EAF5F3" },
  brown: { square: "#A88C73", tint: "#F6F3F1" },
  olive: { square: "#8B8B4B", tint: "#F4F4EB" },
};

export const heroDefaultColor = "#E999BE";

export function sectionColors(value: string | undefined): { square: string; tint: string } {
  const fallback = issueSectionPalette.gray!;
  if (!value) return fallback;
  const named = issueSectionPalette[value];
  if (named) return named;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return { square: fallback.square, tint: value };
  return fallback;
}

/** Inline style for a tinted surface that also behaves in dark mode. */
export function tintStyle(value: string | undefined): string {
  const colors = sectionColors(value);
  return `background-color: light-dark(${colors.tint}, color-mix(in oklab, ${colors.square} 14%, var(--background-raised)))`;
}

let processorPromise: ReturnType<typeof createMarkdownProcessor> | undefined;

async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown.trim()) return "";
  processorPromise ??= createMarkdownProcessor({
    rehypePlugins: [rehypeCodeCopy],
  });
  const processor = await processorPromise;
  // ==text== is the issue dialect's inline highlight. {{unsubscribeUrl}} is
  // substituted per-recipient at send time; on the web it gets "#", matching
  // the platform's own preview behavior.
  const highlighted = markdown
    .replaceAll("{{unsubscribeUrl}}", "#")
    .replace(/==([^=\n][^=\n]*)==/g, "<mark>$1</mark>");
  return (await processor.render(highlighted)).code;
}

export async function renderIssueSections(
  markdown: string,
): Promise<IssueSectionView[]> {
  // Recipient-only sections never appear in the public archive.
  const resolved = resolveIssueConditionals(markdown);
  const sections = parseIssueSections(resolved).filter(
    (section) => !skippedTypes.has(section.type),
  );

  return Promise.all(sections.map(toView));
}

async function toView(section: IssueSection): Promise<IssueSectionView> {
  const view: IssueSectionView = {
    type: section.type,
    attrs: section.attrs,
    title: section.attrs.title ?? defaultTitles[section.type],
    bodyHtml: "",
    items: [],
    itemsHtml: [],
  };

  if (section.type === "links") {
    view.items = await Promise.all(
      section.items.map(async (item) => {
        const parsed = parseLinkItem(item);
        return { ...parsed, descriptionHtml: await markdownToHtml(parsed.description) };
      }),
    );
    return view;
  }

  if (section.type === "classifieds") {
    view.itemsHtml = await Promise.all(section.items.map(markdownToHtml));
    return view;
  }

  view.bodyHtml = await markdownToHtml(section.body);
  return view;
}
