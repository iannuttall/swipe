import { createElement as h } from 'react'
import { Button, Column, Row, Section } from 'react-email'
import type { IssueSection } from './issue-parser.js'
import { issueStyles } from './issue-styles.js'

export function ctaSection(section: IssueSection) {
  const href = section.attrs.url
  const label = section.attrs.label ?? section.body
  if (!href || !label) return null
  const style =
    section.attrs.variant === 'signup' ? issueStyles.signupButton : issueStyles.button

  return h(
    Section,
    null,
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: issueStyles.fullCell },
        h(Button, { href, style }, label),
      ),
    ),
  )
}
