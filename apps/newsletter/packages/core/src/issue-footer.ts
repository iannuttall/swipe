import { Fragment, createElement as h, type ReactNode } from 'react'
import { Column, Img, Link, Row, Section, Text } from 'react-email'
import { fullBleed, issueSiteUrl } from './issue-chrome.js'
import { issueInlineMarkdownStyles } from './issue-markdown-styles.js'
import type { IssueSection } from './issue-parser.js'
import { issueSpacer, mdBlock } from './issue-sections.js'
import { issueColors, issueLayout, issueStyles } from './issue-styles.js'

// Matches the signup pitch on swipe.md so the email and the site say the same
// thing in the same words.
const defaultBlurb = `**Swipe** is the newsletter to learn AI by stealing the cool ideas, skills, and tools you didn't know you needed.

If someone forwarded this to you, [subscribe here](${issueSiteUrl}).`

// One plain column: blurb, then the small print. The share box and the
// blurb/links split are gone; a footer does not need to be a layout.
export function issueFooter(
  footer: IssueSection | undefined,
  _shareUrl?: string,
  background?: string,
  className?: string,
) {
  const attrs = footer?.attrs ?? {}
  return h(
    Fragment,
    null,
    ditherEdge(),
    fullBleed(
      background ?? issueColors.accent,
      className,
      issueSpacer('footer-top'),
      h(
        Section,
        null,
        h(
          Row,
          null,
          h(
            Column,
            {
              className: 'issue-cell issue-footer-blurb',
              style: issueStyles.wideLeftCell,
            },
            blurb(footer),
            footerLinks(attrs),
          ),
        ),
      ),
      issueSpacer('footer-bottom'),
    ),
  )
}

// The page breaking apart into the footer, matching swipe.md. A PNG rather
// than the site's SVG because Gmail drops SVG entirely, and pre-tinted because
// email has no currentColor to inherit.
function ditherEdge() {
  return h(
    Section,
    { style: { lineHeight: '0', fontSize: '0' } },
    h(Img, {
      src: `${issueSiteUrl}/email/dither-edge.png`,
      alt: '',
      width: issueLayout.width,
      height: 32,
      style: {
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        height: '32px',
        border: '0',
      },
    }),
  )
}

function blurb(footer: IssueSection | undefined) {
  const body = footer?.body?.trim() ? footer.body : defaultBlurb
  return mdBlock(body, {
    ...issueInlineMarkdownStyles,
    p: issueStyles.footerText,
    link: issueStyles.footerLink,
  })
}

function footerLinks(attrs: Record<string, string>) {
  // Default is on; pass advertise-url="" to hide it.
  const advertiseUrl = attrs['advertise-url'] ?? `${issueSiteUrl}/advertise`
  const groupEnd = issueStyles.footerText
  const extras: ReactNode[] = []
  if (advertiseUrl) {
    extras.push(
      h(
        Text,
        { key: 'advertise', style: groupEnd },
        h(
          Link,
          { href: advertiseUrl, style: issueStyles.footerLink },
          'Advertise in Swipe',
        ),
      ),
    )
  }
  return h(
    Fragment,
    null,
    ...extras,
    h(
      Text,
      { className: 'issue-address', style: issueStyles.footerSmall },
      antiLinkedAddress(),
    ),
    h(
      Text,
      { style: issueStyles.footerSmall },
      'Had enough? ',
      h(
        Link,
        { href: '{{unsubscribeUrl}}', style: issueStyles.footerMutedLink },
        'Unsubscribe',
      ),
      '.',
    ),
  )
}

function antiLinkedAddress() {
  return '20-22\u200B Wenlock Road,\u200B London,\u200B N1\u200B 7GU'
}
