import { createElement as h } from 'react'
import { Img, Section } from 'react-email'
import { emailAssetUrl } from './email-assets.js'
import { issueStyles } from './issue-styles.js'

// The ink pixels have a one-pixel white halo baked into the 2x PNG. The halo is
// invisible on white and keeps the same image legible when a client forces dark
// mode without exposing a usable media query.
export function issueSectionDivider(key?: string) {
  return h(
    Section,
    { key, style: issueStyles.dividerSection },
    h(Img, {
      className: 'issue-dither',
      src: emailAssetUrl('email/hr-center-universal@2x.png'),
      alt: '',
      width: 560,
      height: 6,
      style: { display: 'block', width: '100%', maxWidth: '560px', border: '0' },
    }),
  )
}
