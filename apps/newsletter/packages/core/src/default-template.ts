import { type ComponentProps, Fragment, createElement as h, type ReactNode } from 'react'
import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email'
import { issueFooter } from './issue-footer.js'
import { type IssueSection, parseIssueSections } from './issue-parser.js'
import {
  issueSectionDivider,
  issueSpacer,
  mdBlockWithCode,
  sectionHeading,
} from './issue-sections.js'
import { issueResponsiveCss } from './issue-styles.js'
import { renderIssueSection } from './issue-template.js'
import {
  barebonesColors,
  defaultEmailMarkdownStyles,
  defaultEmailStyles,
  fontFallback,
  interFonts,
} from './react-email-styles.js'
import type { DraftInput } from './types.js'

type TrackedLinkProps = ComponentProps<typeof Link> & {
  'data-track'?: 'false'
}

// Issue building blocks that can be dropped into the default shell. Chrome types
// (hero/header/footer) stay owned by each template's own shell.
const defaultModularTypes = new Set(['links', 'sponsor', 'box', 'classifieds', 'quote'])

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
  .default-footer .issue-footer-blurb {
    padding-left: 40px !important;
    padding-right: 10px !important;
  }
  .default-footer .issue-footer-links {
    padding-left: 10px !important;
    padding-right: 40px !important;
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
    .default-footer .issue-footer-blurb,
    .default-footer .issue-footer-links {
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
  const blocks: ReactNode[] = []
  sections.forEach((section, index) => {
    if (index > 0) blocks.push(issueSectionDivider(`default-divider-${index}`))
    blocks.push(h(Fragment, { key: index }, defaultBlock(section)))
  })

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

// Colored surfaces sit their box edge on the 40px text gutter; sections
// without a surface use the 20px wrapper so their copy (with its own 20px
// cells) lands on that same gutter.
const defaultColoredTypes = new Set(['sponsor', 'box'])

const defaultSectionTitles: Record<string, string> = {
  sponsor: 'Sponsor',
  links: 'Links',
  classifieds: 'Classifieds',
}

function defaultBlock(section: IssueSection) {
  if (section.type === 'text' && section.attrs.title) {
    return h(
      Fragment,
      null,
      defaultCell(
        'default-content-cell',
        defaultEmailStyles.textWrap,
        sectionHeading(section.attrs.title),
      ),
      defaultCell(
        'default-content-cell',
        defaultEmailStyles.textWrap,
        mdBlockWithCode(
          section.body,
          defaultEmailMarkdownStyles,
          defaultEmailStyles.content,
        ),
      ),
    )
  }

  if (defaultModularTypes.has(section.type)) {
    // The heading renders on the default text grid so every square sits
    // exactly on the 40px gutter, regardless of the body wrapper below.
    const title = section.attrs.title ?? defaultSectionTitles[section.type]
    const heading = title
      ? defaultCell(
          'default-content-cell',
          defaultEmailStyles.textWrap,
          sectionHeading(title),
        )
      : null
    const body = defaultColoredTypes.has(section.type)
      ? defaultCell(
          'default-surface-cell',
          defaultEmailStyles.coloredWrap,
          renderIssueSection(section, false),
        )
      : defaultCell(
          'default-module-cell',
          defaultEmailStyles.modularWrap,
          renderIssueSection(section, false),
        )
    return h(Fragment, null, heading, body)
  }
  return defaultCell(
    'default-content-cell',
    defaultEmailStyles.textWrap,
    mdBlockWithCode(section.body, defaultEmailMarkdownStyles, defaultEmailStyles.content),
  )
}

function defaultFooterBand(footer: IssueSection | undefined) {
  // Undefined so the footer uses its own brand band; the old bg3 grey is what
  // made the white footer type invisible.
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
        'Swipe',
      ),
    ),
    h(
      Column,
      { align: 'right', style: defaultEmailStyles.headerCell, width: '50%' },
      h(Text, { style: defaultEmailStyles.company }, label),
    ),
  )
}

function defaultCell(
  className: string,
  style: ComponentProps<typeof Column>['style'],
  ...children: ReactNode[]
) {
  return h(Section, null, h(Row, null, h(Column, { className, style }, ...children)))
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
