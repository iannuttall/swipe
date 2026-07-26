import type { CSSProperties } from 'react'
import { issueColors, issueText } from './issue-styles.js'

const markdownBase = {
  p: issueText({ marginBottom: '15px' }),
  link: {
    color: issueColors.ink,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    backgroundColor: 'transparent',
  },
  h1: issueText({
    fontSize: '21px',
    fontWeight: 600,
    lineHeight: '23px',
    marginBottom: '15px',
  }),
  h2: issueText({ fontWeight: 600, paddingBottom: '5px' }),
  h3: issueText({ fontWeight: 600, paddingBottom: '5px' }),
  ul: { margin: '0 0 15px', paddingLeft: '22px', listStyleType: 'square' },
  ol: { margin: '0 0 15px', paddingLeft: '22px' },
  li: issueText({ marginBottom: '8px' }),
  blockQuote: {
    margin: '0 0 15px',
    // The inner <p> keeps the global 15px bottom margin (react-email's
    // Markdown styles cannot target it, and :last-child is unreliable in
    // email clients), so balance it in the box padding: 16 top, 1+15 bottom.
    padding: '16px 16px 1px',
    backgroundColor: issueColors.highlight,
    color: issueColors.grey,
  },
  bold: { fontWeight: 600 },
  codeInline: {
    fontFamily: 'Menlo,Consolas,monospace',
    fontSize: '16px',
    backgroundColor: issueColors.highlight,
    padding: '2px 4px',
    borderRadius: '4px',
  },
  codeBlock: {
    display: 'block',
    fontFamily: 'Menlo,Consolas,monospace',
    fontSize: '18px',
    lineHeight: '27px',
    color: issueColors.ink,
    backgroundColor: issueColors.highlight,
    padding: '16px',
    borderRadius: '4px',
    margin: '0 0 15px',
    // Email clients have no horizontal scroll; wrap long commands instead of
    // blowing out the 640px frame.
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  hr: {
    border: 'none',
    borderBottom: `2px solid ${issueColors.line}`,
    margin: '0 0 15px',
  },
} satisfies Record<string, CSSProperties>

export const issueMarkdownStyles = markdownBase

export const issueLeadMarkdownStyles = {
  ...markdownBase,
  p: issueText({ fontSize: '21px', lineHeight: '30px', marginBottom: '15px' }),
} satisfies Record<string, CSSProperties>

export const issueInlineMarkdownStyles = {
  ...markdownBase,
  p: issueText({ marginBottom: '0' }),
} satisfies Record<string, CSSProperties>
