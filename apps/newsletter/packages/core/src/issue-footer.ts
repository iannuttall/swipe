import { Fragment, createElement as h } from 'react'
import { Column, Img, Link, Row, Section, Text } from 'react-email'
import { emailAssetUrl } from './email-assets.js'
import type { IssueSection } from './issue-parser.js'
import { barebonesColors, fontFamily } from './react-email-styles.js'

export function issueFooter(
  footer: IssueSection | undefined,
  _shareUrl?: string,
  _background?: string,
  className?: string,
) {
  const showUnsubscribe = footer?.attrs.unsubscribe !== 'false'
  return h(
    Section,
    { className, style: footerStyles.section },
    h(
      Row,
      null,
      h(
        Column,
        { className: 'issue-footer-cell', style: footerStyles.cell },
        h(Img, {
          className: 'swipe-logo',
          src: emailAssetUrl('email/swipe-email-logo-on-white@2x.png'),
          alt: 'Swipe',
          width: 92,
          height: 32,
          style: footerStyles.logo,
        }),
        showUnsubscribe
          ? h(
              Text,
              { style: footerStyles.copy },
              "Don't want these emails any more? No worries. Here's a slightly greyed out, 13 pixel unsubscribe link for you.",
            )
          : null,
        h(
          Text,
          { className: 'issue-footer-meta', style: footerStyles.meta },
          showUnsubscribe
            ? h(
                Fragment,
                null,
                h(
                  Link,
                  { href: '{{unsubscribeUrl}}', style: footerStyles.link },
                  'Unsubscribe',
                ),
                ' | ',
              )
            : null,
          h(
            Link,
            {
              className: 'issue-footer-address',
              href: '#',
              style: footerStyles.addressLink,
            },
            address(),
          ),
        ),
      ),
    ),
  )
}

function address() {
  return '20-22\u200B Wenlock Road,\u200B London,\u200B N1\u200B 7GU'
}

const footerStyles = {
  section: {
    backgroundColor: barebonesColors.bg,
  },
  cell: {
    padding: '36px 40px 30px',
    textAlign: 'left' as const,
  },
  logo: {
    display: 'block',
    margin: '0 0 18px',
    border: 0,
    outline: 'none',
  },
  copy: {
    margin: '0 0 8px',
    color: barebonesColors.fg3,
    fontFamily,
    fontSize: '16px',
    lineHeight: '23px',
    textAlign: 'left' as const,
  },
  meta: {
    margin: 0,
    color: barebonesColors.fg3,
    fontFamily,
    fontSize: '16px',
    lineHeight: '23px',
    textAlign: 'left' as const,
  },
  link: {
    color: barebonesColors.fg3,
    textDecoration: 'underline',
    textDecorationStyle: 'dotted' as const,
    textUnderlineOffset: '3px',
  },
  addressLink: {
    color: barebonesColors.fg3,
    cursor: 'text',
    pointerEvents: 'none' as const,
    textDecoration: 'none',
  },
}
