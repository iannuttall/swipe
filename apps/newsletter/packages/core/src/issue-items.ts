import { Fragment, createElement as h } from 'react'
import { Column, Link, Row, Section, Text } from 'react-email'
import {
  itemActionStyles,
  itemBodyStyles,
  itemDisclosureStyles,
  itemLastActionStyles,
  itemStyles as styles,
} from './issue-item-styles.js'
import { type IssueItem, type IssueSection, parseIssueItem } from './issue-parser.js'
import { mdBlock, mdBlockWithCode, sectionHeading } from './issue-sections.js'

export function itemContents(items: IssueItem[], issueName?: string) {
  return h(
    Section,
    null,
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: styles.cell },
        h(Text, { style: styles.contentsHeading }, 'In this issue'),
        ...items.map((item) => {
          const href =
            item.sponsor && item.url
              ? item.url
              : issueName
                ? issueArchiveAnchor(issueName, item.id)
                : undefined
          return h(
            Fragment,
            { key: item.id },
            h(
              Row,
              null,
              h(
                Column,
                { style: styles.contentsBulletCell, width: 18 },
                h(Text, { style: styles.contentsBullet }, '▪'),
              ),
              h(
                Column,
                { style: styles.contentsText },
                h(
                  Text,
                  { style: styles.contentsLine },
                  href
                    ? h(
                        Link,
                        {
                          href,
                          style: styles.contentsLink,
                        },
                        item.title,
                      )
                    : item.title,
                  item.summary
                    ? h(
                        'span',
                        { style: styles.summary },
                        `, ${item.summary}${item.sponsor ? ` ${item.sponsorLabel}` : ''}`,
                      )
                    : null,
                ),
              ),
            ),
          )
        }),
      ),
    ),
  )
}

function issueArchiveAnchor(issueName: string, itemId: string): string {
  return `https://swipe.md/issues/${encodeURIComponent(issueName)}#${encodeURIComponent(itemId)}`
}

export function itemSection(section: IssueSection) {
  const item = parseIssueItem(section)
  const title = item.url
    ? h(Link, { href: item.url, style: styles.titleLink }, item.title)
    : item.title
  return h(
    Section,
    { id: item.id },
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: styles.itemCell },
        h(Text, { style: styles.title }, title),
        mdBlockWithCode(
          `${item.description}${item.sponsor ? ` ${item.sponsorLabel}` : ''}`,
          itemBodyStyles,
        ),
        mdBlockWithCode(`**${item.whyLabel}** ${item.why}`, itemActionStyles),
        mdBlockWithCode(`**${item.tryLabel}** ${item.try}`, itemLastActionStyles),
      ),
    ),
  )
}

export function reachOutSection(section: IssueSection, withHeading = true) {
  return h(
    Fragment,
    null,
    withHeading ? sectionHeading(section.attrs.title ?? 'Reach out') : null,
    h(
      Section,
      null,
      h(
        Row,
        null,
        h(
          Column,
          { className: 'issue-cell', style: styles.cell },
          mdBlock(section.body, itemActionStyles),
        ),
      ),
    ),
  )
}

export function disclosureSection(section: IssueSection) {
  return h(
    Section,
    null,
    h(
      Row,
      null,
      h(
        Column,
        { style: styles.markerCell, width: 18 },
        h(Text, { style: styles.disclosureChip }, section.attrs.chip ?? '✦'),
      ),
      h(
        Column,
        { className: 'issue-cell', style: styles.itemCell },
        mdBlock(section.body, itemDisclosureStyles),
      ),
    ),
  )
}

export function markdownCta(issueName: string) {
  const href = `https://swipe.md/issues/${encodeURIComponent(issueName)}.md`
  return h(
    Section,
    { style: styles.markdownSection },
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: styles.cell },
        h(
          Link,
          { href, style: styles.markdownLink },
          h('span', { style: styles.markdownIcon }, '›  '),
          h('span', null, 'View in Markdown for your agent'),
          h('span', { style: styles.markdownIcon }, '  ↗'),
        ),
        h(
          Text,
          { style: styles.markdownNote },
          'Plain ',
          h('code', { style: styles.markdownCode }, '.md'),
          ' you can paste straight into Claude, ChatGPT, or any agent.',
        ),
      ),
    ),
  )
}
