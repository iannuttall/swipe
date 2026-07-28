import type { CSSProperties } from 'react'
import { issueColors } from './issue-palette.js'
import { fontFamily } from './react-email-styles.js'

export {
  type IssueSectionColors,
  issueColors,
  issueSectionPalette,
  resolveIssueColor,
  resolveSectionColors,
} from './issue-palette.js'

export const issueLayout = {
  width: 640,
  narrowCol: 224,
  wideCol: 416,
  halfCol: 320,
  logoWidth: 160,
  // The glyph splits 75/25 like Dense Discovery: most of it sits inside the
  // colored band (transparent bg), a sliver hangs below onto the white body
  // (white bg baked in for dark-mode safety).
  logoTopHeight: 73,
  logoBottomHeight: 24,
  logoFullHeight: 97,
  // Small mark for the simple header strip.
  markWidth: 56,
  markHeight: 34,
  gutter: 20,
  // Pixel widths for the width="" attribute on fluid images so Outlook's
  // Word engine (which ignores CSS width) renders them at column size.
  wideImageWidth: 386,
  narrowImageWidth: 194,
} as const

// Outlook rounds line heights up to its own grid unless told otherwise.
const msoExactLineHeight = {
  msoLineHeightRule: 'exactly',
} as unknown as CSSProperties

export const issueText = (overrides: CSSProperties): CSSProperties => ({
  margin: 0,
  padding: 0,
  color: issueColors.ink,
  fontSize: '16px',
  fontWeight: 400,
  lineHeight: '23px',
  fontFamily,
  ...msoExactLineHeight,
  ...overrides,
})

export const issueStyles = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: issueColors.paper,
    color: issueColors.ink,
    fontFamily,
  },
  frame: {
    maxWidth: `${issueLayout.width}px`,
    width: '100%',
    margin: '0 auto',
  },
  hero: {
    paddingTop: '20px',
  },
  heroQuoteCell: {
    padding: '15px 10px 5px 20px',
    verticalAlign: 'top',
  },
  heroImageCell: {
    padding: '20px 20px 5px 10px',
    verticalAlign: 'top',
  },
  heroLogoCell: {
    padding: '0 0 0 20px',
    fontSize: '1px',
    lineHeight: '1px',
    verticalAlign: 'bottom',
  },
  bodyLogoCell: {
    padding: '0 0 0 20px',
    fontSize: '1px',
    lineHeight: '1px',
  },
  logoImage: {
    display: 'block',
  },
  heroText: issueText({ marginBottom: '5px' }),
  heroAttribution: issueText({ fontWeight: 600 }),
  heroImage: {
    display: 'block',
    width: '100%',
    maxWidth: `${issueLayout.wideCol}px`,
    height: 'auto',
  },
  heroCredit: issueText({ marginBottom: 0 }),
  headerStripCell: {
    padding: '18px 20px',
    verticalAlign: 'middle',
  },
  headerName: issueText({
    fontSize: '14px',
    lineHeight: '19px',
    fontWeight: 600,
    color: issueColors.grey,
    textAlign: 'right' as const,
  }),
  titleCell: {
    padding: '15px 10px 0 20px',
    verticalAlign: 'top',
  },
  titleText: issueText({ fontSize: '21px', fontWeight: 600, lineHeight: '23px' }),
  onlineCell: {
    padding: '15px 20px 0 10px',
    verticalAlign: 'top',
    textAlign: 'right' as const,
  },
  onlineText: issueText({
    fontSize: '14px',
    lineHeight: '19px',
    color: issueColors.grey,
  }),
  onlineLink: {
    color: issueColors.grey,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  spacer: issueText({
    fontSize: '1px',
    lineHeight: '25px',
    height: '25px',
  }),
  dividerSection: {
    padding: '22px 40px',
    lineHeight: '0',
    fontSize: '0',
    textAlign: 'left' as const,
  },
  headingCell: {
    padding: '15px 0',
    verticalAlign: 'middle',
  },
  headingMarkerCell: {
    padding: '15px 5px 15px 0',
    verticalAlign: 'middle',
  },
  headingMarker: issueText({
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '20px',
  }),
  headingText: issueText({
    fontSize: '23px',
    fontWeight: 700,
    lineHeight: '27px',
    margin: 0,
  }),
  narrowLeftCell: {
    padding: '15px 10px 5px 20px',
    verticalAlign: 'top',
  },
  wideRightCell: {
    padding: '15px 20px 5px 10px',
    verticalAlign: 'top',
    textAlign: 'left' as const,
  },
  wideLeftCell: {
    padding: '15px 10px 5px 20px',
    verticalAlign: 'top',
    textAlign: 'left' as const,
  },
  narrowRightCell: {
    padding: '15px 20px 5px 10px',
    verticalAlign: 'top',
    textAlign: 'left' as const,
  },
  fullCell: {
    padding: '15px 20px 5px',
    verticalAlign: 'top',
  },
  linkTitle: issueText({ fontWeight: 600, marginBottom: '5px' }),
  linkTitleAnchor: {
    color: issueColors.accentInk,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  linkTagline: issueText({ color: issueColors.grey, marginBottom: '5px' }),
  boxImage: {
    display: 'block',
    width: '100%',
    maxWidth: '100%',
    height: 'auto',
  },
  boxCaption: issueText({ color: issueColors.grey, margin: '15px 0 0' }),
  divider: {
    // DD 396's thicker classifieds rule.
    borderTop: `5px solid ${issueColors.line}`,
    margin: '0 0 15px',
  },
  classifiedNote: issueText({ color: issueColors.grey, marginBottom: '15px' }),
  classifiedLink: {
    color: issueColors.accentInk,
    fontWeight: 600,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  button: {
    backgroundColor: issueColors.button,
    borderRadius: '10px',
    color: issueColors.buttonText,
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: '23px',
    padding: '7px 15px 8px',
    textAlign: 'center' as const,
    textDecoration: 'none',
  },
  // DD 396 quotes: plain large grey text, no background.
  quoteText: issueText({
    fontSize: '21px',
    fontWeight: 400,
    lineHeight: '31px',
    color: issueColors.grey,
  }),
  footerBand: {
    backgroundColor: issueColors.accent,
  },
  footerCenterCell: {
    padding: '20px 20px 0',
    textAlign: 'center' as const,
    verticalAlign: 'top',
  },
  shareHeading: issueText({
    fontSize: '21px',
    fontWeight: 600,
    lineHeight: '23px',
    color: '#FFFFFF',
    marginBottom: '15px',
    textAlign: 'center' as const,
  }),
  shareBox: issueText({
    margin: '0 0 15px',
    padding: '13px 5px 15px',
    backgroundColor: 'transparent',
    border: '2px solid #FFFFFF',
    color: '#FFFFFF',
    fontWeight: 600,
    textAlign: 'center' as const,
  }),
  shareVia: issueText({
    fontSize: '14px',
    lineHeight: '19px',
    color: '#FFFFFF',
    marginBottom: '15px',
    textAlign: 'center' as const,
  }),
  shareLink: {
    color: '#FFFFFF',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  footerText: issueText({
    color: '#FFFFFF',
    marginBottom: '15px',
    textAlign: 'left' as const,
  }),
  footerSmall: issueText({
    fontSize: '16px',
    lineHeight: '23px',
    color: '#FFFFFF',
    marginBottom: '15px',
    textAlign: 'left' as const,
  }),
  footerLink: {
    color: '#FFFFFF',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  footerMutedLink: {
    color: '#FFFFFF',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
} satisfies Record<string, CSSProperties>

export const issueMsoHeadHtml =
  '<!--[if mso]><style>table,td,p,h1,h2,h3,span,a,div{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->'

export const issueResponsiveCss = `
  /* Apple Mail auto-links postal addresses in blue. Keep footer metadata grey. */
  .issue-footer-meta a[x-apple-data-detectors] {
    color: #7B7D81 !important;
    text-decoration: none !important;
  }
  /* Dotted by default, solid on hover — the inverse of what this used to do,
     and the same treatment as prose links on swipe.md. */
  a {
    text-decoration-style: dotted !important;
    text-underline-offset: 3px !important;
  }
  a:hover {
    text-decoration-style: solid !important;
  }
  @media only screen and (max-width: 599px) {
    .issue-stack {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    .issue-cell {
      padding-left: 12px !important;
      padding-right: 12px !important;
    }
    .issue-hide-mobile {
      display: none !important;
    }
    .issue-spacer {
      height: 15px !important;
      line-height: 15px !important;
    }
  }
`
