import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const config = readFileSync(resolve(root, "apps/site/wrangler.jsonc"), "utf8");

describe("issue tracking routes", () => {
  it("sends browser navigation for dynamic email routes to the Worker", () => {
    for (const route of ["/api/*", "/t/click/*", "/t/open/*", "/unsubscribe/*"]) {
      assert.match(config, new RegExp(`"${route.replaceAll("*", "\\*")}"`));
    }
  });

  it("keeps static site assets out of Worker-first routing", () => {
    assert.doesNotMatch(config, /"run_worker_first"\s*:\s*true/);
  });
});
