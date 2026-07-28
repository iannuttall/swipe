import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const source = resolve(root, 'apps/site/public/email/hr-center-ink@2x.png')
const output = resolve(root, 'apps/site/public/email/hr-center-on-white@2x.png')
const magick = '/opt/homebrew/bin/magick'

execFileSync(magick, [
  source,
  '-background',
  'white',
  '-alpha',
  'remove',
  '-alpha',
  'off',
  '-strip',
  output,
])
console.log(`Wrote ${output}`)
