import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

const newsletterRoot = resolve(import.meta.dirname, '..')
const source = resolve(newsletterRoot, 'emails/welcome.md')
const output = resolve(newsletterRoot, 'packages/core/dist/welcome.md')

copyFileSync(source, output)
console.log(`Copied ${source} to ${output}`)
