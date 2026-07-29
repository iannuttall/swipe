import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

const newsletterRoot = resolve(import.meta.dirname, '..')
const contentFiles = ['confirmation.md', 'welcome.md']

for (const contentFile of contentFiles) {
  const source = resolve(newsletterRoot, 'emails', contentFile)
  const output = resolve(newsletterRoot, 'packages/core/dist', contentFile)
  copyFileSync(source, output)
  console.log(`Copied ${source} to ${output}`)
}
