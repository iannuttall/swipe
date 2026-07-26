import { type CSSProperties, Fragment, createElement as h, type ReactNode } from 'react'
import { Column, Hr, Img, Link, Markdown, Row, Section, Text } from 'react-email'
import { issueCodeBlock, splitIssueBody } from './issue-code.js'
import { withHardLineBreaks } from './issue-markdown.js'
import {
  issueInlineMarkdownStyles,
  issueLeadMarkdownStyles,
  issueMarkdownStyles,
} from './issue-markdown-styles.js'
import { type IssueSection, parseLinkItem } from './issue-parser.js'
import {
  issueColors,
  issueLayout,
  issueStyles,
  resolveSectionColors,
} from './issue-styles.js'

const defaultClassifiedsButton = 'Book yours ↗︎'
const defaultClassifiedsButtonUrl = 'https://swipe.md/advertise'
const sectionMarkers: Record<string, string> = {
  sponsor: '✦',
  links: '＋',
  classifieds: '◆',
  poll: '?',
}

export function issueSpacer(key?: string) {
  return h(
    Section,
    { key },
    h(Text, { className: 'issue-spacer', style: issueStyles.spacer }, ' '),
  )
}

// ==text== renders as DD's yellow inline highlight. The Markdown component
// passes inline HTML through untouched, so this stays a plain styled span.
function withHighlights(markdown: string): string {
  return markdown.replace(
    /==([^=\n][^=\n]*)==/g,
    `<span style="background-color:${issueColors.textHighlight};padding:2px 0">$1</span>`,
  )
}

export function mdBlock(
  markdown: string,
  customStyles: Record<string, CSSProperties> = issueMarkdownStyles,
  containerStyle?: CSSProperties,
): ReactNode {
  return h(Markdown, {
    markdownContainerStyles: containerStyle ?? {},
    markdownCustomStyles: customStyles,
    // biome-ignore lint/correctness/noChildrenProp: React Email Markdown types require this prop.
    children: withHardLineBreaks(withHighlights(markdown)),
  })
}

export function headingMarker(section: IssueSection): string {
  return section.attrs.marker ?? sectionMarkers[section.type] ?? '▲'
}

// mdBlock plus fenced-code awareness: markdown renders through the Markdown
// component, ``` fences through the themed <CodeBlock>.
export function mdBlockWithCode(
  markdown: string,
  customStyles: Record<string, CSSProperties> = issueMarkdownStyles,
  containerStyle?: CSSProperties,
): ReactNode {
  const segments = splitIssueBody(markdown)
  if (!segments.some((segment) => segment.kind === 'code')) {
    return mdBlock(markdown, customStyles, containerStyle)
  }
  return h(
    Fragment,
    null,
    ...segments.map((segment, index) =>
      segment.kind === 'code'
        ? issueCodeBlock(segment.content, segment.language, `code-${index}`)
        : h(
            Fragment,
            { key: `md-${index}` },
            mdBlock(segment.content, customStyles, containerStyle),
          ),
    ),
  )
}

export function squareHeading(title: string, marker = '▲') {
  return h(
    Section,
    null,
    h(
      Row,
      null,
      h(
        Column,
        { style: issueStyles.headingCell },
        h(
          Text,
          { style: issueStyles.headingText },
          h('span', { style: issueStyles.headingMarker }, marker),
          h('span', null, title),
        ),
      ),
    ),
  )
}

function stackedColumns(
  left: ReactNode,
  right: ReactNode,
  widths: [number, number],
  styles: [CSSProperties, CSSProperties],
  background?: string,
) {
  const bg = background ? { backgroundColor: background } : {}
  return h(
    Row,
    null,
    h(
      Column,
      {
        className: 'issue-stack issue-cell',
        style: { ...styles[0], ...bg },
        width: widths[0],
      },
      left,
    ),
    h(
      Column,
      {
        className: 'issue-stack issue-cell',
        style: { ...styles[1], ...bg },
        width: widths[1],
      },
      right,
    ),
  )
}

export function textSection(section: IssueSection, withHeading = true) {
  const styles = section.type === 'lead' ? issueLeadMarkdownStyles : issueMarkdownStyles
  return h(
    Fragment,
    null,
    withHeading && section.attrs.title
      ? squareHeading(section.attrs.title, headingMarker(section))
      : null,
    h(
      Section,
      null,
      h(
        Row,
        null,
        h(
          Column,
          { className: 'issue-cell', style: issueStyles.fullCell },
          mdBlockWithCode(section.body, styles),
        ),
      ),
    ),
  )
}

export function linksSection(section: IssueSection, withHeading = true) {
  const rows = section.items.map((item, index) => {
    const parsed = parseLinkItem(item)
    const title = h(
      Text,
      { style: issueStyles.linkTitle },
      parsed.url
        ? h(Link, { href: parsed.url, style: issueStyles.linkTitleAnchor }, parsed.title)
        : parsed.title,
      ' ↗︎',
    )
    const tagline = parsed.tagline
      ? h(Text, { style: issueStyles.linkTagline }, parsed.tagline)
      : null
    return h(
      Fragment,
      { key: `${parsed.title}-${index}` },
      stackedColumns(
        h(Fragment, null, title, tagline),
        mdBlock(parsed.description),
        [issueLayout.narrowCol, issueLayout.wideCol],
        [issueStyles.narrowLeftCell, issueStyles.wideRightCell],
      ),
    )
  })
  return h(
    Fragment,
    null,
    withHeading
      ? squareHeading(section.attrs.title ?? 'Links', headingMarker(section))
      : null,
    h(Section, null, ...rows),
  )
}

export function boxSection(section: IssueSection, withHeading = true) {
  const colors = resolveSectionColors(section.attrs.color)
  const heading =
    withHeading && section.attrs.title
      ? squareHeading(section.attrs.title, headingMarker(section))
      : null
  const background = colors.tint
  const content = mdBlockWithCode(section.body)
  let body: ReactNode
  if (section.attrs.image) {
    const image = h(
      Fragment,
      null,
      h(Img, {
        src: section.attrs.image,
        alt: section.attrs['image-alt'] ?? '',
        width: issueLayout.narrowImageWidth,
        style: issueStyles.boxImage,
      }),
      section.attrs.caption
        ? mdBlock(section.attrs.caption, {
            ...issueInlineMarkdownStyles,
            p: issueStyles.boxCaption,
            link: issueStyles.footerMutedLink,
          })
        : null,
    )
    const imageRight = section.attrs['image-side'] === 'right'
    body = imageRight
      ? stackedColumns(
          content,
          image,
          [issueLayout.wideCol, issueLayout.narrowCol],
          [
            { ...issueStyles.wideLeftCell, padding: '15px 10px 15px 20px' },
            { ...issueStyles.narrowRightCell, padding: '15px 20px 15px 10px' },
          ],
          background,
        )
      : stackedColumns(
          image,
          content,
          [issueLayout.narrowCol, issueLayout.wideCol],
          [
            { ...issueStyles.narrowLeftCell, padding: '15px 10px 15px 20px' },
            { ...issueStyles.wideRightCell, padding: '15px 20px 15px 10px' },
          ],
          background,
        )
  } else {
    body = h(
      Row,
      null,
      h(
        Column,
        {
          className: 'issue-cell',
          style: { ...issueStyles.fullCell, backgroundColor: background },
        },
        content,
      ),
    )
  }
  return h(Fragment, null, heading, h(Section, null, body))
}

export function sponsorSection(section: IssueSection, withHeading = true) {
  // DD 396 sponsor: dark square, light grey box (the default pair).
  const withTitle: IssueSection = {
    ...section,
    attrs: { title: 'Sponsor', ...section.attrs },
  }
  return boxSection(withTitle, withHeading)
}

export function classifiedsSection(section: IssueSection, withHeading = true) {
  const entries = section.items.flatMap((item, index) => {
    const entry = mdBlock(item, {
      ...issueMarkdownStyles,
      link: issueStyles.classifiedLink,
    })
    if (index === section.items.length - 1) return [entry]
    return [entry, h(Hr, { key: `divider-${index}`, style: issueStyles.divider })]
  })
  const note = section.attrs.note
    ? mdBlock(section.attrs.note, {
        ...issueInlineMarkdownStyles,
        p: issueStyles.classifiedNote,
      })
    : null
  const buttonLabel = section.attrs.button ?? defaultClassifiedsButton
  const buttonUrl = section.attrs['button-url'] ?? defaultClassifiedsButtonUrl
  const button =
    buttonLabel && buttonUrl
      ? h(
          Text,
          { style: { margin: '0 0 15px', padding: 0 } },
          h(Link, { href: buttonUrl, style: issueStyles.button }, buttonLabel),
        )
      : null
  return h(
    Fragment,
    null,
    withHeading
      ? squareHeading(section.attrs.title ?? 'Classifieds', headingMarker(section))
      : null,
    h(
      Section,
      null,
      stackedColumns(
        h(Fragment, null, ...entries),
        h(Fragment, null, note, button),
        [issueLayout.wideCol, issueLayout.narrowCol],
        [issueStyles.wideLeftCell, issueStyles.narrowRightCell],
      ),
    ),
  )
}

export function quoteSection(section: IssueSection, withHeading = true) {
  const paragraphs = section.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) =>
      h(
        Text,
        { key: index, style: { ...issueStyles.quoteText, margin: '0 0 15px' } },
        paragraph,
      ),
    )
  return h(
    Fragment,
    null,
    withHeading && section.attrs.title
      ? squareHeading(section.attrs.title, headingMarker(section))
      : null,
    h(
      Section,
      null,
      h(
        Row,
        null,
        h(
          Column,
          { className: 'issue-cell', style: issueStyles.fullCell },
          ...paragraphs,
        ),
      ),
    ),
  )
}
