import { Fragment, createElement as h, type ReactNode } from 'react'
import { Column, Link, Row, Section, Text } from 'react-email'
import { fullBleed, issueSiteUrl } from './issue-chrome.js'
import { issueInlineMarkdownStyles } from './issue-markdown-styles.js'
import type { IssueSection } from './issue-parser.js'
import { issueSpacer, mdBlock } from './issue-sections.js'
import { issueColors, issueLayout, issueStyles } from './issue-styles.js'

const defaultBlurb = `**Swipe** helps you learn AI by stealing useful skills, prompts, tools, and workflows. Thanks for reading all the way to the end.

If someone forwarded this to you, you can [subscribe here](${issueSiteUrl}).`

const defaultShareText = 'Really enjoying Swipe. Check out this issue:'

// Dense Discovery-style mega footer: a full-width grey band holding a
// centered share box plus a blurb/links two-column block.
export function issueFooter(
  footer: IssueSection | undefined,
  shareUrl?: string,
  background?: string,
  className?: string,
) {
  const attrs = footer?.attrs ?? {}
  const url = attrs['share-url'] ?? shareUrl
  return fullBleed(
    background ?? issueColors.highlight,
    className,
    issueSpacer('footer-top'),
    url ? shareBlock(url, attrs['share-text'] ?? defaultShareText) : null,
    h(
      Section,
      null,
      h(
        Row,
        null,
        h(
          Column,
          {
            className: 'issue-stack issue-cell issue-footer-blurb',
            style: issueStyles.wideLeftCell,
            width: issueLayout.wideCol,
          },
          blurb(footer),
        ),
        h(
          Column,
          {
            className: 'issue-stack issue-cell issue-footer-links',
            style: issueStyles.narrowRightCell,
            width: issueLayout.narrowCol,
          },
          footerLinks(attrs),
        ),
      ),
    ),
    issueSpacer('footer-bottom'),
  )
}

function shareBlock(url: string, shareText: string) {
  const display = url.replace(/^https?:\/\//, '')
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${url}`)}`
  const mail = `mailto:?subject=${encodeURIComponent('Newsletter recommendation')}&body=${encodeURIComponent(`${shareText} ${url}`)}`
  return h(
    Section,
    null,
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-cell', style: issueStyles.footerCenterCell },
        h(Text, { style: issueStyles.shareHeading }, 'Enjoyed this issue? Share it:'),
        h(
          Text,
          { style: issueStyles.shareBox },
          h(Link, { href: url, style: issueStyles.shareLink }, display),
        ),
        h(
          Text,
          { style: issueStyles.shareVia },
          'Share via: ',
          h(Link, { href: tweet, style: issueStyles.shareLink }, 'X'),
          ' / ',
          h(Link, { href: mail, style: issueStyles.shareLink }, 'Email'),
        ),
      ),
    ),
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
      h(
        Link,
        { href: '{{unsubscribeUrl}}', style: issueStyles.footerMutedLink },
        'Unsubscribe',
      ),
    ),
  )
}

function antiLinkedAddress() {
  return '20-22\u200B Wenlock Road,\u200B London,\u200B N1\u200B 7GU'
}
