import { createElement as h } from 'react'
import { Img, Section } from 'react-email'
import { emailAssetUrl } from './email-assets.js'
import { issueStyles } from './issue-styles.js'

// The ink pixels sit on an opaque white background. It disappears into a light
// email and remains legible when a client forces a dark background.
export function issueSectionDivider(key?: string) {
  return h(
    Section,
    { key, style: issueStyles.dividerSection },
    h(Img, {
      className: 'issue-dither',
      src: emailAssetUrl('email/hr-center-on-white@2x.png'),
      alt: '',
      width: 560,
      height: 6,
      style: { display: 'block', width: '100%', maxWidth: '560px', border: '0' },
    }),
  )
}
