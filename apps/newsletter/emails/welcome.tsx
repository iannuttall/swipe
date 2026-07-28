import { DefaultEmail, welcomeEmailContent } from '@email/core'

export default function WelcomeEmailPreview() {
  return <DefaultEmail {...welcomeEmailContent} />
}
