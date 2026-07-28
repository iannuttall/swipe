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
const darkOutput = resolve(root, 'apps/site/public/email/swipe-email-logo-dark@2x.png')
const magick = '/opt/homebrew/bin/magick'
const fonttools = '/opt/homebrew/bin/fonttools'
const fontUrl =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf'

const workDir = mkdtempSync(join(tmpdir(), 'swipe-email-logo-'))
const variableFont = join(workDir, 'BricolageGrotesque-variable.ttf')
const staticFont = join(workDir, 'BricolageGrotesque-SemiBold.ttf')
const lightSourcePath = join(workDir, 'swipe-email-logo-light.svg')
const darkSourcePath = join(workDir, 'swipe-email-logo-dark.svg')

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
  const darkSource = lightSource.replace(
    '<text x="65" y="36.5" fill="#0F1115"',
    '<text x="65" y="36.5" fill="#FFFFFF"',
  )
  writeFileSync(lightSourcePath, lightSource)
  writeFileSync(darkSourcePath, darkSource)
  renderLogo(lightSourcePath, lightOutput)
  renderLogo(darkSourcePath, darkOutput)

  console.log(`Wrote ${lightOutput}`)
  console.log(`Wrote ${darkOutput}`)
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
