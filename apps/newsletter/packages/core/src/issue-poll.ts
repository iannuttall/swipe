import { Fragment, createElement as h } from 'react'
import { Column, Link, Row, Section, Text } from 'react-email'
import type { IssueSection } from './issue-parser.js'
import { headingMarker, squareHeading } from './issue-sections.js'
import { issueLayout, issueStyles, resolveSectionColors } from './issue-styles.js'

const letters = 'ABCDEFGHIJ'

// DD 396 poll: colored box with the question on the left and lettered white
// option rows on the right; every option is a link (vote URL).
export function pollSection(section: IssueSection, withHeading = true) {
  const colors = resolveSectionColors(section.attrs.color ?? 'yellow')
  const options = section.items.map((item, index) => {
    const link = item.match(/\[([^\]]+)\]\(([^)\s]+)\)/)
    const label = link?.[1] ?? item.trim()
    const url = link?.[2]
    return h(
      Fragment,
      { key: index },
      index > 0
        ? h(Text, { style: { ...issueStyles.pollRowGap, margin: 0 } }, ' ')
        : null,
      h(
        Row,
        null,
        h(
          Column,
          {
            style: {
              ...issueStyles.pollLetterCell,
              backgroundColor: colors.square,
            },
            width: 34,
          },
          h(Text, { style: issueStyles.pollLetterText }, letters[index] ?? '•'),
        ),
        h(
          Column,
          { style: issueStyles.pollOptionCell },
          h(
            Text,
            { style: issueStyles.pollOptionText },
            url
              ? h(Link, { href: url, style: issueStyles.pollOptionLink }, label)
              : label,
          ),
        ),
      ),
    )
  })

  const question = h(
    Fragment,
    null,
    section.attrs.question
      ? h(Text, { style: issueStyles.pollQuestion }, section.attrs.question)
      : null,
    section.attrs['results-url']
      ? h(
          Text,
          { style: issueStyles.pollResultsText },
          h(
            Link,
            { href: section.attrs['results-url'], style: issueStyles.pollResultsLink },
            'Previous poll results',
          ),
        )
      : null,
  )

  return h(
    Fragment,
    null,
    withHeading
      ? squareHeading(section.attrs.title ?? 'Poll', headingMarker(section))
      : null,
    h(
      Section,
      null,
      h(
        Row,
        null,
        h(
          Column,
          {
            className: 'issue-stack issue-cell',
            style: { ...issueStyles.narrowLeftCell, backgroundColor: colors.tint },
            width: issueLayout.narrowCol,
          },
          question,
        ),
        h(
          Column,
          {
            className: 'issue-stack issue-cell',
            style: { ...issueStyles.wideRightCell, backgroundColor: colors.tint },
            width: issueLayout.wideCol,
          },
          ...options,
        ),
      ),
    ),
  )
}
