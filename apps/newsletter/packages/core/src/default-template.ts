import { type ComponentProps, createElement as h } from 'react'
import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email'
import { defaultBlocks } from './default-template-blocks.js'
import { emailAssetUrl } from './email-assets.js'
import { issueFooter } from './issue-footer.js'
import { type IssueSection, parseIssueSections } from './issue-parser.js'
import { issueResponsiveCss } from './issue-styles.js'
import { defaultEmailStyles, fontFallback, interFonts } from './react-email-styles.js'
import type { DraftInput } from './types.js'

type TrackedLinkProps = ComponentProps<typeof Link> & {
  'data-track'?: 'false'
}

// Default text sits 40px from the shell edge on desktop. React Email puts
// Section padding on a generated inner <td>, so responsive gutter classes must
// live on Column cells instead of Section wrappers. On mobile the default shell
// owns one explicit 16px content edge; modular section cells inherit that same
// edge so body text, headings, link blocks, classifieds, and footer copy line
// up top-to-bottom.
const defaultResponsiveCss = `${issueResponsiveCss}
  /* The Font components emit "* { font-family: Inter... }" rules that Gmail
     rewrites to beat inline styles; win the war for code with !important. */
  pre, pre *, code, code * {
    font-family: Menlo, Consolas, monospace !important;
  }
  @media only screen and (max-width: 599px) {
    .default-header-cell,
    .default-content-cell,
    .default-surface-cell {
      padding-left: 16px !important;
      padding-right: 16px !important;
    }
    .default-module-cell {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    .default-module-cell .issue-cell,
    .default-footer .issue-footer-cell {
      padding-left: 16px !important;
      padding-right: 16px !important;
    }
  }
`

// Same reading-time rule as the site (issueReadingMinutes in apps/site):
// Component and legacy fence lines excluded, 220 words per minute, minimum one minute.
function readingMinutes(markdown: string): number {
  const words = markdown
    .split(/\r?\n/)
    .filter((line) => !/^(:::|<\/?[A-Z][A-Za-z0-9]*\b)/.test(line.trim()))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

export function DefaultEmail(draft: DraftInput) {
  const parsed = parseIssueSections(draft.bodyMarkdown)
  const header = parsed.find((section) => section.type === 'header')
  const footer = parsed.find((section) => section.type === 'footer')
  const sections = parsed.filter(
    (section) => !['hero', 'header', 'footer'].includes(section.type),
  )
  const blocks = defaultBlocks(sections, draft.name)

  return h(
    Html,
    { lang: 'en' },
    h(
      Head,
      null,
      fontFaces(),
      h('style', {
        // biome-ignore lint/security/noDangerouslySetInnerHtml: React Email requires raw CSS in Head.
        dangerouslySetInnerHTML: { __html: defaultResponsiveCss },
      }),
    ),
    draft.preview ? h(Preview, null, draft.preview) : null,
    h(
      Body,
      { style: defaultEmailStyles.body },
      h(
        Container,
        { style: defaultEmailStyles.frame },
        h(
          Section,
          { style: defaultEmailStyles.shell },
          defaultHeader(header, readingMinutes(draft.bodyMarkdown)),
          h(Section, { style: defaultEmailStyles.contentArea }, ...blocks),
          defaultFooterBand(footer),
        ),
      ),
    ),
  )
}

function defaultFooterBand(footer: IssueSection | undefined) {
  return issueFooter(footer, undefined, undefined, 'default-footer')
}

function defaultHeader(header: IssueSection | undefined, minutes?: number) {
  return h(
    Section,
    { style: defaultEmailStyles.header },
    h(
      Row,
      null,
      h(
        Column,
        { className: 'default-header-cell', style: defaultEmailStyles.headerInset },
        headerRow(header, minutes),
      ),
    ),
  )
}

function headerRow(header: IssueSection | undefined, minutes?: number) {
  // <Header name="Issue 001" /> renders "Issue 001 - 3 min read" top-right.
  // Opt out with read-time="off".
  const name = header?.attrs.name
  const withTime =
    name && minutes && header?.attrs['read-time'] !== 'off'
      ? `${name} - ${minutes} min read`
      : name
  const label = withTime ?? 'Swipe'
  return h(
    Row,
    null,
    h(
      Column,
      {
        style: { ...defaultEmailStyles.headerCell, textAlign: 'left' as const },
        width: '50%',
      },
      h(
        Link,
        untrackedLinkProps({
          href: 'https://swipe.md',
          style: defaultEmailStyles.logoLink,
        }),
        h(Img, {
          className: 'swipe-logo',
          src: emailAssetUrl('email/swipe-email-logo-universal@2x.png'),
          alt: 'Swipe',
          width: 137,
          height: 42,
          style: defaultEmailStyles.logo,
        }),
      ),
    ),
    h(
      Column,
      { align: 'right', style: defaultEmailStyles.headerCell, width: '50%' },
      h(Text, { style: defaultEmailStyles.company }, label),
    ),
  )
}

function fontFaces() {
  return interFonts.map((font) =>
    h(Font, {
      key: font.weight,
      fontFamily: 'Inter',
      fallbackFontFamily: fontFallback,
      webFont: {
        url: font.url,
        format: 'truetype',
      },
      fontWeight: font.weight,
      fontStyle: 'normal',
    }),
  )
}

function untrackedLinkProps(props: ComponentProps<typeof Link>): TrackedLinkProps {
  return { ...props, 'data-track': 'false' }
}
