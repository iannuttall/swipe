// Swipe brand palette. One accent, one ink, one grey, one tint. The email is
// mostly type on white; colour is for the accent and the footer band.
export const issueColors = {
  paper: '#FFFFFF',
  ink: '#0F1115',
  grey: '#5A5A5A',
  // Brand pink, matching --primary on swipe.md. Used for surfaces.
  accent: '#FF4FA3',
  // Deeper pink for text on white, where #FF4FA3 falls under 4.5:1.
  accentInk: '#C4185F',
  highlight: '#F4F4F5',
  line: '#E5E7EB',
  button: '#0F1115',
  buttonText: '#FFFFFF',
  heroDefault: '#FF4FA3',
  // Inline text highlight (==text== in markdown).
  textHighlight: '#FFE3F0',
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
