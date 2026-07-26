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
  headingCell: {
    padding: '15px 0',
    verticalAlign: 'middle',
  },
  headingText: issueText({
    fontSize: '23px',
    fontWeight: 700,
    lineHeight: '27px',
    margin: 0,
  }),
  headingMarker: issueText({
    display: 'inline-block',
    fontSize: '21px',
    lineHeight: '1',
    marginRight: '10px',
    verticalAlign: 'middle',
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
    color: issueColors.ink,
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
    color: issueColors.ink,
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
  pollQuestion: issueText({ fontSize: '21px', lineHeight: '31px', marginBottom: '15px' }),
  pollResultsLink: {
    color: issueColors.grey,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  pollResultsText: issueText({
    fontSize: '14px',
    lineHeight: '19px',
    color: issueColors.grey,
    marginBottom: '15px',
  }),
  pollLetterCell: {
    width: '34px',
    padding: '7px 0',
    textAlign: 'center' as const,
    verticalAlign: 'middle',
  },
  pollLetterText: issueText({
    fontWeight: 700,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  }),
  pollOptionCell: {
    backgroundColor: '#FFFFFF',
    padding: '7px 12px',
    verticalAlign: 'middle',
  },
  pollOptionLink: {
    color: issueColors.ink,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  pollOptionText: issueText({}),
  pollRowGap: issueText({ fontSize: '1px', lineHeight: '5px', height: '5px' }),
  footerBand: {
    backgroundColor: issueColors.highlight,
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
    marginBottom: '15px',
    textAlign: 'center' as const,
  }),
  shareBox: issueText({
    margin: '0 0 15px',
    padding: '13px 5px 15px',
    backgroundColor: '#FFFFFF',
    border: '2px dashed #C7C7C7',
    fontWeight: 600,
    textAlign: 'center' as const,
  }),
  shareVia: issueText({
    fontSize: '14px',
    lineHeight: '19px',
    marginBottom: '15px',
    textAlign: 'center' as const,
  }),
  shareLink: {
    color: issueColors.ink,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  footerText: issueText({ marginBottom: '15px', textAlign: 'left' as const }),
  footerSmall: issueText({
    fontSize: '16px',
    lineHeight: '23px',
    color: issueColors.grey,
    marginBottom: '15px',
    textAlign: 'left' as const,
  }),
  footerLink: {
    color: issueColors.ink,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  footerMutedLink: {
    color: issueColors.grey,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
} satisfies Record<string, CSSProperties>

export const issueMsoHeadHtml =
  '<!--[if mso]><style>table,td,p,h1,h2,h3,span,a,div{font-family:Helvetica,Arial,sans-serif !important;}</style><![endif]-->'

export const issueResponsiveCss = `
  a[x-apple-data-detectors], .issue-address, .issue-address a {
    color: ${issueColors.grey} !important;
    text-decoration: none !important;
  }
  a:hover {
    text-decoration-style: dotted !important;
    text-underline-offset: 2px !important;
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
