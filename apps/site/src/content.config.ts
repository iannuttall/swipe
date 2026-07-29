import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const issues = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/issues" }),
  schema: z.object({
    subject: z.string(),
    preheader: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
    sentAt: z.coerce.date().optional(),
    broadcastId: z.string().optional(),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/tools" }),
  schema: z.object({
    name: z.string(),
    seoTitle: z.string(),
    headline: z.string(),
    tagline: z.string(),
    description: z.string(),
    icon: z.string().startsWith("/tools/icons/").optional(),
    url: z.url(),
    kind: z.enum([
      "web-app",
      "mobile-app",
      "desktop-app",
      "browser-extension",
      "repository",
    ]),
    platforms: z.array(z.string()).min(1),
    repository: z.url().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    status: z.enum(["early", "established"]).default("early"),
    firstSeen: z.coerce.date(),
    lastChecked: z.coerce.date(),
    reviewEveryDays: z.number().int().min(30).max(365).default(180),
    featuredIssues: z.array(z.string()).default([]),
    sources: z
      .array(
        z.object({
          kind: z.enum([
            "landing",
            "docs",
            "repository",
            "readme",
            "release",
            "test",
            "other",
          ]),
          label: z.string(),
          url: z.url(),
          checkedAt: z.coerce.date(),
        }),
      )
      .min(1),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    headline: z.string().optional(),
    description: z.string(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    /** Set false on pages where a signup card would be inappropriate. */
    signup: z.boolean().default(true),
  }),
});

export const collections = { issues, pages, tools };
