import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const sourcePath = resolve(
  root,
  'apps/newsletter/emails/static/swipe-email-logo-source.svg',
)
const lightOutput = resolve(root, 'apps/site/public/email/swipe-email-logo@2x.png')
const universalOutput = resolve(
  root,
  'apps/site/public/email/swipe-email-logo-universal@2x.png',
)
const magick = '/opt/homebrew/bin/magick'
const fonttools = '/opt/homebrew/bin/fonttools'
const fontUrl =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf'

const workDir = mkdtempSync(join(tmpdir(), 'swipe-email-logo-'))
const variableFont = join(workDir, 'BricolageGrotesque-variable.ttf')
const staticFont = join(workDir, 'BricolageGrotesque-SemiBold.ttf')
const lightSourcePath = join(workDir, 'swipe-email-logo-light.svg')
const textMask = join(workDir, 'swipe-email-logo-text-mask.png')
const textHalo = join(workDir, 'swipe-email-logo-text-halo.png')

try {
  execFileSync('curl', ['-fsSL', fontUrl, '-o', variableFont])
  execFileSync(fonttools, [
    'varLib.instancer',
    variableFont,
    'opsz=48',
    'wdth=100',
    'wght=600',
    '-o',
    staticFont,
  ])

  const lightSource = readFileSync(sourcePath, 'utf8')
  writeFileSync(lightSourcePath, lightSource)
  renderLogo(lightSourcePath, lightOutput)
  addTextHalo(lightOutput, universalOutput)

  console.log(`Wrote ${lightOutput}`)
  console.log(`Wrote ${universalOutput}`)
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

function renderLogo(source, output) {
  execFileSync(magick, [
    '-background',
    'none',
    '-density',
    '192',
    '-font',
    staticFont,
    source,
    '-resize',
    '340x104!',
    '-strip',
    output,
  ])
}

function addTextHalo(source, output) {
  execFileSync(magick, [
    source,
    '-crop',
    '220x104+120+0',
    '+repage',
    '-alpha',
    'extract',
    '-morphology',
    'Dilate',
    'Diamond:2',
    textMask,
  ])
  execFileSync(magick, [
    '-size',
    '220x104',
    'xc:white',
    textMask,
    '-alpha',
    'off',
    '-compose',
    'CopyOpacity',
    '-composite',
    textHalo,
  ])
  execFileSync(magick, [
    '-size',
    '340x104',
    'xc:none',
    textHalo,
    '-geometry',
    '+120+0',
    '-compose',
    'over',
    '-composite',
    source,
    '-compose',
    'over',
    '-composite',
    '-strip',
    output,
  ])
}
