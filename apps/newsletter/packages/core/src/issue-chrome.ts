import { Fragment, createElement as h, type ReactNode } from 'react'
import { Column, Container, Img, Link, Row, Section, Text } from 'react-email'
import { issueInlineMarkdownStyles } from './issue-markdown-styles.js'
import type { IssueSection } from './issue-parser.js'
import { mdBlock } from './issue-sections.js'
import {
  issueColors,
  issueLayout,
  issueStyles,
  resolveIssueColor,
} from './issue-styles.js'

export const issueSiteUrl = 'https://swipe.md'

// Dense Discovery bands span the full viewport width while their content
// stays on the 640px grid: an outer 100% Section carries the background, an
// inner Container carries the content. The width attribute override keeps a
// fixed 640 for Outlook's Word engine, which ignores max-width.
export function fullBleed(
  background: string | undefined,
  ...children: ReactNode[]
): ReactNode
export function fullBleed(
  background: string | undefined,
  className: string | undefined,
  ...children: ReactNode[]
): ReactNode
export function fullBleed(
  background: string | undefined,
  classOrChild?: string | ReactNode,
  ...rest: ReactNode[]
) {
  const bg = background ? { backgroundColor: background } : {}
  const className = typeof classOrChild === 'string' ? classOrChild : undefined
  const children =
    typeof classOrChild === 'string'
      ? rest
      : classOrChild === undefined
        ? rest
        : [classOrChild, ...rest]
  return h(
    Section,
    { className, style: bg },
    h(Container, { width: issueLayout.width, style: issueStyles.frame }, ...children),
  )
}

export function heroBand(hero: IssueSection) {
  const background = resolveIssueColor(hero.attrs.color, issueColors.heroDefault)
  const quote = hero.body
    ? mdBlock(hero.body, {
        ...issueInlineMarkdownStyles,
        p: issueStyles.heroText,
        link: { color: issueColors.ink, textDecoration: 'underline' },
      })
    : null
  const image = hero.attrs.image
    ? h(
        Fragment,
        null,
        h(Img, {
          src: hero.attrs.image,
          alt: hero.attrs['image-alt'] ?? '',
          width: issueLayout.wideImageWidth,
          style: issueStyles.heroImage,
        }),
        hero.attrs.credit
          ? mdBlock(hero.attrs.credit, {
              ...issueInlineMarkdownStyles,
              p: issueStyles.heroCredit,
            })
          : null,
      )
    : null
  const content = h(
    Section,
    { style: issueStyles.hero },
    image
      ? h(
          Row,
          null,
          h(
            Column,
            {
              className: 'issue-stack issue-cell',
              style: issueStyles.heroQuoteCell,
              width: issueLayout.narrowCol,
            },
            quote,
          ),
          h(
            Column,
            {
              className: 'issue-stack issue-cell',
              style: issueStyles.heroImageCell,
              width: issueLayout.wideCol,
            },
            image,
          ),
        )
      : h(
          Row,
          null,
          h(Column, { className: 'issue-cell', style: issueStyles.heroQuoteCell }, quote),
        ),
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: issueStyles.heroLogoCell },
        brandWordmark(hero.attrs.url ?? issueSiteUrl),
      ),
    ),
  )
  return fullBleed(background, content)
}

// Note-style simple header: small mark on the left, publication name on the
// right, optionally on a full-bleed color strip. The transparent mark goes on
// colored strips (band color survives forced dark mode); the white-baked mark
// goes on white headers for the same reason.
export function simpleHeader(header: IssueSection | undefined) {
  const attrs = header?.attrs ?? {}
  const background = attrs.color
    ? resolveIssueColor(attrs.color, issueColors.heroDefault)
    : undefined
  const strip = h(
    Section,
    null,
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: issueStyles.headerStripCell, width: '50%' },
        brandWordmark(attrs.url ?? issueSiteUrl),
      ),
      h(
        Column,
        { className: 'issue-cell', style: issueStyles.headerStripCell, width: '50%' },
        h(Text, { style: issueStyles.headerName }, attrs.name ?? 'Swipe'),
      ),
    ),
  )
  return fullBleed(background, strip)
}

export function headerTitleRow(header: IssueSection | undefined) {
  const attrs = header?.attrs ?? {}
  if (!attrs.title) return null
  return h(Section, null, headlineRow(attrs))
}

export function titleRow(hero: IssueSection) {
  return h(
    Section,
    null,
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: issueStyles.bodyLogoCell },
        brandWordmark(hero.attrs.url ?? issueSiteUrl),
      ),
    ),
    headlineRow(hero.attrs),
  )
}

function headlineRow(attrs: Record<string, string>) {
  if (!attrs.title) return null
  const online = attrs['online-url']
    ? h(
        Column,
        {
          className: 'issue-hide-mobile issue-cell',
          style: issueStyles.onlineCell,
          width: issueLayout.halfCol,
        },
        h(
          Text,
          { style: issueStyles.onlineText },
          h(
            Link,
            { href: attrs['online-url'], style: issueStyles.onlineLink },
            'View/share online',
          ),
          ' ↗︎',
        ),
      )
    : null
  return h(
    Row,
    null,
    h(
      Column,
      {
        className: 'issue-stack issue-cell',
        style: issueStyles.titleCell,
        width: online ? issueLayout.halfCol : '100%',
      },
      h(Text, { style: issueStyles.titleText }, attrs.title),
    ),
    online,
  )
}

function brandWordmark(href: string) {
  return h(
    Link,
    { href, style: { color: issueColors.ink, textDecoration: 'none' } },
    h(Text, { style: issueStyles.headerName }, 'Swipe'),
  )
}
