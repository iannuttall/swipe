// The issue-block parser exists twice on purpose: the newsletter core owns
// the canonical copy (email rendering must not depend on site code, and the
// VPS Docker build cannot see root packages yet), and the site keeps a
// verbatim copy for the /issues archive. This check fails the build the
// moment the two files drift so the dialect can never fork silently.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const siteDir = process.cwd();
const siteCopy = resolve(siteDir, "src/lib/issues/parser.ts");
const canonical = resolve(
  siteDir,
  "../../apps/newsletter/packages/core/src/issue-parser.ts",
);

const a = readFileSync(siteCopy, "utf8");
const b = readFileSync(canonical, "utf8");

if (a !== b) {
  console.error(
    "Issue parser drift: apps/site/src/lib/issues/parser.ts no longer matches",
  );
  console.error("apps/newsletter/packages/core/src/issue-parser.ts.");
  console.error(
    "Update whichever side changed by copying the canonical file verbatim.",
  );
  process.exit(1);
}

console.log("Issue parser parity OK.");
