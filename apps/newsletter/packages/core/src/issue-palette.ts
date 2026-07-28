// The centre blue carries links and controls. Pink and cyan stay decorative
// so low-contrast logo accents never become body text.
export const issueColors = {
  paper: '#FFFFFF',
  ink: '#0F1115',
  grey: '#5A5A5A',
  accent: '#4548E9',
  accentInk: '#4548E9',
  accentLeft: '#FD30F8',
  accentRight: '#43D8F7',
  highlight: '#F4F4F5',
  line: '#E5E7EB',
  button: '#4548E9',
  buttonText: '#FFFFFF',
  heroDefault: '#4548E9',
  // Inline text highlight (==text== in markdown).
  textHighlight: '#E9FAFD',
} as const

export interface IssueSectionColors {
  square: string
  tint: string
}

// The multi-hue Dense Discovery palette is gone. Surfaces are a single neutral
// tint so a section never competes with the accent, but named colours still
// resolve so published issues that set `color=` keep rendering.
const neutralSurface: IssueSectionColors = {
  square: issueColors.ink,
  tint: issueColors.highlight,
}

export const issueSectionPalette = {
  gray: neutralSurface,
  yellow: neutralSurface,
  pink: neutralSurface,
  green: neutralSurface,
  blue: neutralSurface,
  purple: neutralSurface,
  teal: neutralSurface,
  red: neutralSurface,
  orange: neutralSurface,
  mint: neutralSurface,
  brown: neutralSurface,
  olive: neutralSurface,
} as const

export function resolveSectionColors(value: string | undefined): IssueSectionColors {
  if (!value) return neutralSurface
  // A raw hex still means "this exact tint" for a one-off campaign.
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    return { square: neutralSurface.square, tint: value }
  }
  return neutralSurface
}

// Bands (hero/simple header) take a raw hex, or fall back to the brand accent.
export function resolveIssueColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value
  return fallback
}
