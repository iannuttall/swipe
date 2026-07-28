import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DefaultEmail, parseWelcomeEmailContent } from '@email/core'

const contentPath = join(dirname(fileURLToPath(import.meta.url)), 'welcome.md')
const welcomeEmailContent = parseWelcomeEmailContent(readFileSync(contentPath, 'utf8'))

export default function WelcomeEmailPreview() {
  return <DefaultEmail {...welcomeEmailContent} />
}
