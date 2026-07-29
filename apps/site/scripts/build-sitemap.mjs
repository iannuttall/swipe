import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import yaml from "js-yaml";

const appRoot = process.cwd();
const publicDir = join(appRoot, "public");
const siteUrl = "https://swipe.md";
const toolsPerPage = 12;
const staticPaths = [
  "/",
  "/issues",
  "/tools",
  "/privacy",
  "/terms",
  "/cookies",
];

async function contentPaths(directory, prefix) {
  const root = join(appRoot, "src/content", directory);
  const files = await walk(root);
  const paths = [];

  for (const file of files) {
    if (![".md", ".mdx"].includes(extname(file))) continue;
    const source = await readFile(file, "utf8");
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;

    const frontmatter = yaml.load(match[1]);
    if (frontmatter && typeof frontmatter === "object" && frontmatter.draft === true) {
      continue;
    }

    const slug = relative(root, file)
      .split(sep)
      .join("/")
      .replace(/\.(md|mdx)$/, "");
    paths.push(`${prefix}/${slug}`);
  }

  return paths;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

const issuePaths = await contentPaths("issues", "/issues");
const toolPaths = await contentPaths("tools", "/tools");
const pagePaths = await contentPaths("pages", "");
const toolPagePaths = Array.from(
  { length: Math.max(0, Math.ceil(toolPaths.length / toolsPerPage) - 1) },
  (_, index) => `/tools/page/${index + 2}`,
);

const paths = [
  ...staticPaths,
  ...issuePaths,
  ...toolPaths,
  ...toolPagePaths,
  ...pagePaths,
];
const urls = [...new Set(paths)]
  .sort()
  .map((path) => `  <url><loc>${new URL(path || "/", siteUrl).toString()}</loc></url>`)
  .join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

await writeFile(join(publicDir, "sitemap.xml"), xml);
console.log(`Wrote ${paths.length} URLs to public/sitemap.xml.`);
