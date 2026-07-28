import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DefaultEmail } from '@email/core/react-email-templates'
import { parseWelcomeEmailContent } from '@email/core/welcome-content'

const contentPath = join(process.cwd(), 'emails', 'welcome.md')
const welcomeEmailContent = parseWelcomeEmailContent(readFileSync(contentPath, 'utf8'))

export default function WelcomeEmailPreview() {
  return <DefaultEmail {...welcomeEmailContent} />
}
