import { createElement as h } from 'react'
import { Column, Img, Link, Row, Section, Text } from 'react-email'
import { emailAssetUrl } from './email-assets.js'
import { issueColors } from './issue-palette.js'
import type { IssueSection } from './issue-parser.js'
import { barebonesColors, fontFamily } from './react-email-styles.js'

export function issueFooter(
  _footer: IssueSection | undefined,
  _shareUrl?: string,
  _background?: string,
  className?: string,
) {
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
          src: emailAssetUrl('email/swipe-email-logo-universal@2x.png'),
          alt: 'Swipe',
          width: 105,
          height: 32,
          style: footerStyles.logo,
        }),
        h(Text, { className: 'issue-address', style: footerStyles.address }, address()),
        h(
          Text,
          { style: footerStyles.unsubscribeLine },
          h(
            Link,
            { href: '{{unsubscribeUrl}}', style: footerStyles.link },
            'Unsubscribe',
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
  address: {
    margin: '0 0 3px',
    color: barebonesColors.fg,
    fontFamily,
    fontSize: '15px',
    lineHeight: '23px',
    textAlign: 'left' as const,
  },
  unsubscribeLine: {
    margin: 0,
    fontFamily,
    fontSize: '15px',
    lineHeight: '23px',
    textAlign: 'left' as const,
  },
  link: {
    color: issueColors.accentInk,
    textDecoration: 'underline',
    textDecorationStyle: 'dotted' as const,
    textUnderlineOffset: '3px',
  },
}
