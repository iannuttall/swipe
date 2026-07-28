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
const whitePanelOutput = resolve(
  root,
  'apps/site/public/email/swipe-email-logo-on-white@2x.png',
)
const magick = '/opt/homebrew/bin/magick'
const fonttools = '/opt/homebrew/bin/fonttools'
const fontUrl =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf'

const workDir = mkdtempSync(join(tmpdir(), 'swipe-email-logo-'))
const variableFont = join(workDir, 'BricolageGrotesque-variable.ttf')
const staticFont = join(workDir, 'BricolageGrotesque-SemiBold.ttf')
const lightSourcePath = join(workDir, 'swipe-email-logo-light.svg')
const whitePanelSourcePath = join(workDir, 'swipe-email-logo-on-white.svg')

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
  const whitePanelSource = lightSource.replace(
    'viewBox="0 0 170 52" width="170" height="52">',
    [
      'viewBox="-2 0.5 149.5 52" width="149.5" height="52">',
      '  <rect x="-2" y="0.5" width="149.5" height="52" rx="8" fill="#FFFFFF"/>',
    ].join('\n'),
  )
  if (whitePanelSource === lightSource) {
    throw new Error('Could not add the white email-logo panel to the source SVG')
  }
  writeFileSync(lightSourcePath, lightSource)
  writeFileSync(whitePanelSourcePath, whitePanelSource)
  renderLogo(lightSourcePath, lightOutput, '340x104!')
  renderLogo(whitePanelSourcePath, whitePanelOutput, '299x104!')

  console.log(`Wrote ${lightOutput}`)
  console.log(`Wrote ${whitePanelOutput}`)
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

function renderLogo(source, output, size) {
  execFileSync(magick, [
    '-background',
    'none',
    '-density',
    '192',
    '-font',
    staticFont,
    source,
    '-resize',
    size,
    '-strip',
    output,
  ])
}
