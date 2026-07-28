import { createElement as h } from 'react'
import { Img, Section } from 'react-email'
import { emailAssetUrl } from './email-assets.js'
import { issueStyles } from './issue-styles.js'

// The 2x PNG has an ink and paper version. Light is the safe fallback; clients
// that expose a dark-mode media query swap to the paper line.
export function issueSectionDivider(key?: string) {
  return h(
    Section,
    { key, style: issueStyles.dividerSection },
    h(Img, {
      className: 'issue-dither-light',
      src: emailAssetUrl('email/hr-center-ink@2x.png'),
      alt: '',
      width: 560,
      height: 6,
      style: { display: 'block', width: '100%', maxWidth: '560px', border: '0' },
    }),
    h(Img, {
      className: 'issue-dither-dark',
      src: emailAssetUrl('email/hr-center-paper@2x.png'),
      alt: '',
      width: 560,
      height: 6,
      style: {
        display: 'none',
        width: '100%',
        maxWidth: '560px',
        border: '0',
      },
    }),
  )
}
