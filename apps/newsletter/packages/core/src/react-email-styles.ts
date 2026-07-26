import type { CSSProperties } from 'react'

export const fontFamily = 'Inter, Helvetica, Arial, sans-serif'

export const fontFallback: ['Helvetica', 'Arial', 'sans-serif'] = [
  'Helvetica',
  'Arial',
  'sans-serif',
]

export const barebonesColors = {
  bg: '#FFFFFF',
  bg2: '#F3F4F6',
  // Footer band: off-white, a hair off the card so it reads as part of the
  // card rather than blending into the grey page background.
  bg3: '#F9F9F9',
  fg: '#14171E',
  fg2: '#43454B',
  fg3: '#7B7D81',
  stroke: '#F0F0F0',
  strokeStrong: '#E4E4E7',
  brand: '#614500',
} as const

export const interFonts = [
  {
    weight: 400,
    url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
  },
  {
    weight: 500,
    url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf',
  },
  {
    weight: 600,
    url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf',
  },
] as const

export const defaultEmailStyles = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: barebonesColors.bg2,
    color: barebonesColors.fg,
    fontFamily,
    textAlign: 'center',
  },
  frame: {
    maxWidth: '640px',
    width: '100%',
    margin: '32px auto 0',
    backgroundColor: barebonesColors.bg,
  },
  shell: {
    backgroundColor: barebonesColors.bg,
    // No side padding: full-bleed sections (sponsor boxes, footer band) paint
    // to the card edges; text blocks carry their own 40px gutters.
    padding: '16px 0 0',
  },
  header: {
    margin: '0 0 12px',
  },
  headerInset: {
    // Match the 40px horizontal inset of text blocks so the mark and the
    // body copy share the same left edge.
    padding: '0 40px',
  },
  headerCell: {
    padding: '7px 0',
    verticalAlign: 'middle',
  },
  markCell: {
    width: '32px',
    verticalAlign: 'middle',
  },
  mark: {
    display: 'block',
  },
  logoLink: {
    display: 'inline-block',
    textDecoration: 'none',
  },
  logo: {
    display: 'block',
    border: 0,
    outline: 'none',
    textDecoration: 'none',
  },
  company: {
    margin: 0,
    color: barebonesColors.fg3,
    fontSize: '13px',
    fontWeight: 400,
    letterSpacing: '-0.039px',
    lineHeight: '1.5',
    textAlign: 'right',
    fontFamily,
  },
  contentArea: {
    backgroundColor: barebonesColors.bg,
    padding: '64px 0 40px',
    textAlign: 'left',
  },
  textWrap: {
    padding: '0 40px',
    textAlign: 'left',
  },
  // Modular issue sections carry their own 20px cell gutters; this wrapper
  // adds the remaining 20px so they share the text's 40px content edge.
  modularWrap: {
    padding: '0 20px',
    textAlign: 'left',
  },
  // Colored surfaces put their box edge directly on the 40px text gutter.
  coloredWrap: {
    padding: '0 40px',
    textAlign: 'left',
  },
  content: {
    color: barebonesColors.fg,
    fontSize: '18px',
    fontWeight: 400,
    letterSpacing: '-0.048px',
    lineHeight: '27px',
    textAlign: 'left',
  },
  footerInner: {
    padding: '40px 20px',
    textAlign: 'left',
  },
  footerBlurbCell: {
    padding: '0 20px 0 0',
    verticalAlign: 'top',
  },
  footerLinksCell: {
    padding: '0 0 0 20px',
    verticalAlign: 'top',
  },
  footerText: {
    margin: '0 0 20px',
    color: barebonesColors.fg,
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '23px',
    textAlign: 'left',
    fontFamily,
  },
  footerLinkLine: {
    margin: '0 0 20px',
    color: barebonesColors.fg,
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '23px',
    textAlign: 'left',
    fontFamily,
  },
  footerLink: {
    color: barebonesColors.fg,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  footerSmall: {
    margin: 0,
    color: barebonesColors.fg3,
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '22px',
    textAlign: 'left',
    fontFamily,
  },
} satisfies Record<string, CSSProperties>

export const defaultEmailMarkdownStyles = {
  h1: {
    margin: '0 0 24px',
    color: barebonesColors.fg,
    fontSize: '28px',
    fontWeight: 600,
    letterSpacing: '-0.084px',
    lineHeight: '1.3',
  },
  h2: {
    margin: '0 0 16px',
    color: barebonesColors.fg,
    fontSize: '24px',
    fontWeight: 600,
    letterSpacing: '-0.084px',
    lineHeight: '1',
  },
  p: {
    margin: '0 0 24px',
    color: barebonesColors.fg,
    fontSize: '18px',
    fontWeight: 400,
    lineHeight: '27px',
  },
  link: {
    color: barebonesColors.fg,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    backgroundColor: 'transparent',
  },
  ul: { margin: '0 0 24px', paddingLeft: '22px', listStyleType: 'square' },
  ol: { margin: '0 0 24px', paddingLeft: '22px' },
  li: {
    margin: '0 0 8px',
    color: barebonesColors.fg,
    fontSize: '18px',
    fontWeight: 400,
    lineHeight: '27px',
  },
  blockquote: {
    margin: '0 0 24px',
    paddingLeft: '16px',
    borderLeft: `3px solid ${barebonesColors.strokeStrong}`,
    color: barebonesColors.fg2,
  },
  code: {
    fontFamily: 'Menlo,Consolas,monospace',
    fontSize: '18px',
    lineHeight: '27px',
    backgroundColor: barebonesColors.bg2,
    padding: '2px 4px',
    borderRadius: '4px',
  },
  codeInline: {
    fontFamily: 'Menlo,Consolas,monospace',
    fontSize: '18px',
    lineHeight: '27px',
    backgroundColor: barebonesColors.bg2,
    padding: '2px 4px',
    borderRadius: '4px',
  },
  pre: {
    margin: '0 0 24px',
    padding: '16px',
    backgroundColor: barebonesColors.bg2,
    color: barebonesColors.fg,
    fontFamily: 'Menlo,Consolas,monospace',
    fontSize: '16px',
    lineHeight: '24px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
} satisfies Record<string, CSSProperties>
