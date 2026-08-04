import type { CSSProperties } from 'react'
import { issueColors } from './issue-styles.js'
import {
  barebonesColors,
  defaultEmailMarkdownStyles,
  fontFamily,
} from './react-email-styles.js'

export const itemBodyStyles = {
  ...defaultEmailMarkdownStyles,
  p: {
    ...defaultEmailMarkdownStyles.p,
    margin: '0 0 15px',
    color: barebonesColors.fg,
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '14px',
    lineHeight: '21px',
  },
  li: {
    ...defaultEmailMarkdownStyles.li,
    color: barebonesColors.fg,
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '14px',
    lineHeight: '21px',
  },
} satisfies Record<string, CSSProperties>

export const itemActionStyles = {
  ...itemBodyStyles,
  p: {
    ...itemBodyStyles.p,
    color: barebonesColors.fg,
    fontFamily,
    fontSize: '16px',
    lineHeight: '24px',
  },
  li: {
    ...itemBodyStyles.li,
    fontFamily,
    fontSize: '16px',
    lineHeight: '24px',
  },
  bold: {
    color: barebonesColors.fg,
    fontWeight: 600,
  },
} satisfies Record<string, CSSProperties>

export const itemLastActionStyles = {
  ...itemActionStyles,
  p: {
    ...itemActionStyles.p,
    margin: 0,
  },
} satisfies Record<string, CSSProperties>

export const itemDisclosureStyles = {
  ...itemBodyStyles,
  p: {
    ...itemBodyStyles.p,
    margin: 0,
    color: barebonesColors.fg,
    fontFamily,
    fontSize: '15px',
    fontStyle: 'italic',
    lineHeight: '24px',
  },
} satisfies Record<string, CSSProperties>

export const itemStyles = {
  cell: {
    padding: '0 20px',
    verticalAlign: 'top',
  },
  contentsHeading: {
    margin: '0 0 16px',
    color: barebonesColors.fg,
    fontFamily,
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: '24px',
  },
  contentsBulletCell: {
    padding: '0 7px 9px 0',
    verticalAlign: 'top',
  },
  contentsBullet: {
    margin: 0,
    color: barebonesColors.fg,
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '24px',
    textAlign: 'center',
  },
  contentsText: {
    padding: '0 0 9px',
    verticalAlign: 'top',
  },
  contentsLine: {
    margin: 0,
    color: barebonesColors.fg,
    fontFamily,
    fontSize: '18px',
    lineHeight: '24px',
  },
  contentsLink: {
    color: issueColors.accentInk,
    fontWeight: 600,
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
    textUnderlineOffset: '3px',
  },
  summary: {
    color: barebonesColors.fg,
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '21px',
  },
  markerCell: {
    padding: '1px 5px 0 0',
    verticalAlign: 'top',
  },
  itemCell: {
    padding: '0 20px 25px',
    verticalAlign: 'top',
  },
  title: {
    margin: '0 0 2px',
    color: barebonesColors.fg,
    fontFamily,
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: '24px',
  },
  titleLink: {
    color: issueColors.accentInk,
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
    textUnderlineOffset: '3px',
  },
  disclosureChip: {
    margin: 0,
    color: barebonesColors.fg,
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '24px',
  },
  markdownLink: {
    backgroundColor: barebonesColors.bg2,
    border: `1px solid ${issueColors.line}`,
    borderRadius: '8px',
    color: barebonesColors.fg,
    display: 'block',
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '24px',
    padding: '14px 18px',
    textAlign: 'center',
    textDecoration: 'none',
  },
  markdownIcon: {
    color: issueColors.accentInk,
  },
  markdownNote: {
    margin: '10px 0 0',
    color: barebonesColors.fg3,
    fontFamily,
    fontSize: '13px',
    lineHeight: '20px',
    textAlign: 'center',
  },
  markdownCode: {
    backgroundColor: barebonesColors.bg2,
    borderRadius: '4px',
    color: barebonesColors.fg,
    fontFamily: 'Menlo, Consolas, monospace',
    padding: '2px 5px',
  },
  markdownSection: {
    paddingBottom: '24px',
  },
} satisfies Record<string, CSSProperties>
