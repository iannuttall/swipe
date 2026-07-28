// The issue-block parser exists twice on purpose: the newsletter core owns
// the canonical copy (email rendering must not depend on site code, and the
// VPS Docker build cannot see root packages yet), and the site keeps a
// verbatim copy for the /issues archive. This check fails the build the
// moment the two files drift so the dialect can never fork silently.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const siteDir = process.cwd();
const pairs = [
  ["src/lib/issues/parser.ts", "../../apps/newsletter/packages/core/src/issue-parser.ts"],
  [
    "src/lib/issues/issue-item-parser.ts",
    "../../apps/newsletter/packages/core/src/issue-item-parser.ts",
  ],
];

for (const [sitePath, canonicalPath] of pairs) {
  const siteCopy = resolve(siteDir, sitePath);
  const canonical = resolve(siteDir, canonicalPath);
  if (readFileSync(siteCopy, "utf8") === readFileSync(canonical, "utf8")) continue;
  console.error(`Issue parser drift: apps/site/${sitePath} no longer matches`);
  console.error(canonicalPath.replace("../../", ""));
  console.error("Update whichever side changed by copying the canonical file verbatim.");
  process.exit(1);
}

console.log("Issue parser parity OK.");
