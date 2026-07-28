import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const source = resolve(root, 'apps/site/public/email/hr-center-ink@2x.png')
const output = resolve(root, 'apps/site/public/email/hr-center-universal@2x.png')
const magick = '/opt/homebrew/bin/magick'
const workDir = mkdtempSync(join(tmpdir(), 'swipe-email-divider-'))
const mask = join(workDir, 'halo-mask.png')
const halo = join(workDir, 'halo.png')

try {
  execFileSync(magick, [
    source,
    '-alpha',
    'extract',
    '-morphology',
    'Dilate',
    'Diamond:1',
    mask,
  ])
  execFileSync(magick, [
    '-size',
    '1200x12',
    'xc:white',
    mask,
    '-alpha',
    'off',
    '-compose',
    'CopyOpacity',
    '-composite',
    halo,
  ])
  execFileSync(magick, [halo, source, '-compose', 'over', '-composite', '-strip', output])
  console.log(`Wrote ${output}`)
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
