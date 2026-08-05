import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const gitSha =
  process.env.WORKERS_CI_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

if (!/^[0-9a-f]{40}$/i.test(gitSha)) {
  throw new Error("Deploy marker needs a full 40-character Git SHA");
}

const directory = resolve(import.meta.dirname, "../public/.well-known");
mkdirSync(directory, { recursive: true });
writeFileSync(
  resolve(directory, "deploy.json"),
  `${JSON.stringify(
    {
      deployId: gitSha,
      gitSha,
      buildId: process.env.WORKERS_CI_BUILD_UUID ?? "local",
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote deploy marker for ${gitSha.slice(0, 8)}.`);
