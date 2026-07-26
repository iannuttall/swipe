export function withHardLineBreaks(markdown: string): string {
  const output: string[] = []
  let paragraph: string[] = []
  let inCodeFence = false

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    output.push(formatParagraph(paragraph))
    paragraph = []
  }

  for (const line of markdown.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) {
      flushParagraph()
      output.push(line)
      inCodeFence = !inCodeFence
      continue
    }

    if (inCodeFence) {
      output.push(line)
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      output.push(line)
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  return output.join('\n')
}

function formatParagraph(lines: string[]): string {
  if (lines.length < 2 || lines.some(isBlockLine)) return lines.join('\n')

  return lines
    .map((line, index) => (index === lines.length - 1 ? line : `${line}  `))
    .join('\n')
}

function isBlockLine(line: string): boolean {
  return /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|:::\s*|---\s*$|\|)/.test(line.trim())
}
