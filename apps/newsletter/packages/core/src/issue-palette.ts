export const issueColors = {
  paper: '#FFFFFF',
  ink: '#14171E',
  grey: '#5A5A5A',
  highlight: '#F2F2F2',
  line: '#F1F1F1',
  button: '#313131',
  buttonText: '#FFFFFF',
  heroDefault: '#E999BE',
  // Inline text highlight (==text== in markdown), DD's .hl yellow.
  textHighlight: '#FDF2B4',
} as const

export interface IssueSectionColors {
  square: string
  tint: string
}

// Dense Discovery 396 section palette: a saturated square for the heading
// marker paired with a light tint for the section's box surface.
export const issueSectionPalette = {
  gray: { square: '#313131', tint: '#F1F1F1' },
  yellow: { square: '#F1C755', tint: '#FAF4E5' },
  pink: { square: '#C74B9E', tint: '#FBF2F8' },
  green: { square: '#7CB663', tint: '#F1F6EF' },
  blue: { square: '#3175B9', tint: '#EAF2FA' },
  purple: { square: '#6D54A5', tint: '#F3F1F8' },
  teal: { square: '#29899E', tint: '#E8F5F7' },
  red: { square: '#DB5644', tint: '#FBF1F0' },
  orange: { square: '#E78931', tint: '#FAF4EF' },
  mint: { square: '#41A494', tint: '#EAF5F3' },
  brown: { square: '#A88C73', tint: '#F6F3F1' },
  olive: { square: '#8B8B4B', tint: '#F4F4EB' },
} as const

export function resolveSectionColors(value: string | undefined): IssueSectionColors {
  const fallback = issueSectionPalette.gray
  if (!value) return fallback
  const named = (issueSectionPalette as Record<string, IssueSectionColors | undefined>)[
    value
  ]
  if (named) return named
  // A raw hex means "this box tint" with the default dark square.
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return { square: fallback.square, tint: value }
  return fallback
}

// Bands (hero/simple header) take a named palette tint or a raw hex.
export function resolveIssueColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const named = (issueSectionPalette as Record<string, IssueSectionColors | undefined>)[
    value
  ]
  if (named) return named.tint
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value
  return fallback
}
