import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_MAX_LINES = 350
const HARD_MAX_LINES = 1000
const ALLOWLIST = new Map([
  ['packages/api/src/index.test.ts', 398],
  ['packages/api/src/index.ts', 676],
  ['packages/cli/src/index.test.ts', 500],
  ['packages/cli/src/index.ts', 787],
  ['packages/core/src/db/schema.ts', 650],
  ['packages/core/src/memory-store.ts', 1000],
  ['packages/core/src/platform.test.ts', 520],
  ['packages/core/src/platform.ts', 1000],
  ['packages/core/src/postgres-store.integration.test.ts', 400],
  ['packages/core/src/postgres-store.ts', 1000],
  ['packages/core/src/store.ts', 450],
  ['packages/mcp/src/index.ts', 750],
])

const ignoredDirs = new Set([
  '.git',
  '.turbo',
  'dist',
  'dist-test',
  'local-test',
  'node_modules',
])

const files = await collect(ROOT)
const failures = []

for (const file of files) {
  const relative = path.relative(ROOT, file)
  const maxLines = Math.min(ALLOWLIST.get(relative) ?? DEFAULT_MAX_LINES, HARD_MAX_LINES)
  const content = await readFile(file, 'utf8')
  const lines = content.endsWith('\n')
    ? content.split('\n').length - 1
    : content.split('\n').length
  if (lines > maxLines) {
    failures.push({ relative, lines, maxLines })
  }
}

if (failures.length > 0) {
  console.error('File line limit failed:')
  for (const failure of failures) {
    console.error(
      `- ${failure.relative}: ${failure.lines} lines, max ${failure.maxLines}`,
    )
  }
  process.exitCode = 1
}

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue
      results.push(...(await collect(path.join(dir, entry.name))))
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue
    const fullPath = path.join(dir, entry.name)
    const relative = path.relative(ROOT, fullPath)
    if (!relative.startsWith('packages/')) continue
    results.push(fullPath)
  }
  return results
}
