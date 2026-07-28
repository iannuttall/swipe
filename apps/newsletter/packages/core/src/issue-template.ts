import { Fragment, createElement as h, type ReactNode } from 'react'
import { Body, Font, Head, Html, Preview } from 'react-email'
import {
  fullBleed,
  headerTitleRow,
  heroBand,
  simpleHeader,
  titleRow,
} from './issue-chrome.js'
import { ctaSection } from './issue-cta.js'
import { issueFooter } from './issue-footer.js'
import { disclosureSection, itemSection, reachOutSection } from './issue-items.js'
import type { IssueSection } from './issue-parser.js'
import { parseIssueSections } from './issue-parser.js'
import {
  boxSection,
  classifiedsSection,
  issueSpacer,
  linksSection,
  quoteSection,
  sponsorSection,
  textSection,
} from './issue-sections.js'
import { issueResponsiveCss, issueStyles } from './issue-styles.js'
import { fontFallback, interFonts } from './react-email-styles.js'
import type { DraftInput } from './types.js'

export function IssueEmail(draft: DraftInput) {
  const sections = parseIssueSections(draft.bodyMarkdown)
  const hero = sections.find((section) => section.type === 'hero')
  const header = sections.find((section) => section.type === 'header')
  const footer = sections.find((section) => section.type === 'footer')
  const content = sections.filter(
    (section) => section !== hero && section !== header && section !== footer,
  )
  const chrome = hero ?? header

  const rendered: ReactNode[] = []
  content.forEach((section, index) => {
    rendered.push(h(Fragment, { key: index }, renderIssueSection(section)))
    rendered.push(issueSpacer(`spacer-${index}`))
  })

  return h(
    Html,
    { lang: 'en' },
    h(
      Head,
      null,
      fontFaces(),
      h('style', {
        // biome-ignore lint/security/noDangerouslySetInnerHtml: React Email requires raw CSS in Head.
        dangerouslySetInnerHTML: { __html: issueResponsiveCss },
      }),
    ),
    draft.preview ? h(Preview, null, draft.preview) : null,
    h(
      Body,
      { style: issueStyles.body },
      hero ? heroBand(hero) : simpleHeader(header),
      fullBleed(
        undefined,
        hero ? titleRow(hero) : headerTitleRow(header),
        issueSpacer('spacer-top'),
        ...rendered,
        issueSpacer('spacer-bottom'),
      ),
      issueFooter(footer, chrome?.attrs['online-url']),
    ),
  )
}

export function renderIssueSection(section: IssueSection, withHeading = true): ReactNode {
  switch (section.type) {
    case 'links':
      return linksSection(section, withHeading)
    case 'sponsor':
      return sponsorSection(section, withHeading)
    case 'box':
      return boxSection(section, withHeading)
    case 'classifieds':
      return classifiedsSection(section, withHeading)
    case 'cta':
      return ctaSection(section)
    case 'quote':
      return quoteSection(section, withHeading)
    case 'item':
      return itemSection(section)
    case 'reach-out':
      return reachOutSection(section, withHeading)
    case 'disclosure':
      return disclosureSection(section)
    default:
      return textSection(section, withHeading)
  }
}

function fontFaces() {
  return interFonts.map((font) =>
    h(Font, {
      key: font.weight,
      fontFamily: 'Inter',
      fallbackFontFamily: fontFallback,
      webFont: {
        url: font.url,
        format: 'truetype',
      },
      fontWeight: font.weight,
      fontStyle: 'normal',
    }),
  )
}
