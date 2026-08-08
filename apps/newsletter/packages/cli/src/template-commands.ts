import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  type DraftInput,
  listEmailTemplates,
  preparePreflightEmail,
  renderDraftEmail,
  runPreSendChecks,
  summarizeMailTesterReport,
} from '@email/core'
import { getStringFlag, type ParsedArgs } from './args.js'
import { runSpamAssassin } from './spamassassin.js'

export async function runTemplateCommand(
  parsed: ParsedArgs,
  env: NodeJS.ProcessEnv = process.env,
  fetchUrl?: typeof fetch,
): Promise<object | undefined> {
  const [area, action] = parsed.positionals
  if (area === 'template' && action === 'list') {
    return { templates: listEmailTemplates() }
  }

  if (area !== 'template' || (action !== 'render' && action !== 'preflight')) {
    return undefined
  }

  const draft = await draftInput(parsed)
  const status = getStringFlag(parsed, 'status')
  if (status && status !== 'new' && status !== 'warm' && status !== 'cold') {
    throw new Error('Invalid --status; expected new, warm, or cold')
  }
  const rendered = await renderDraftEmail(draft, status ? { status } : {})
  if (action === 'preflight') {
    const fromEmail = getStringFlag(parsed, 'from-email') ?? env.EMAIL_FROM_EMAIL
    if (!fromEmail) throw new Error('Missing --from-email or EMAIL_FROM_EMAIL')
    const baseUrl = getStringFlag(parsed, 'base-url') ?? env.BASE_URL
    if (!baseUrl) throw new Error('Missing --base-url or BASE_URL')
    const fromName = getStringFlag(parsed, 'from-name') ?? env.EMAIL_FROM_NAME
    const prepared = preparePreflightEmail({
      rendered,
      fromEmail,
      ...(fromName ? { fromName } : {}),
      baseUrl,
    })
    const spamAssassin = runSpamAssassin({
      mime: prepared.mime,
      command:
        getStringFlag(parsed, 'spamassassin-command') ??
        env.EMAIL_SPAMASSASSIN_COMMAND ??
        'spamassassin',
    })
    const mailTesterPath = getStringFlag(parsed, 'mail-tester-report')
    const mailTester = mailTesterPath
      ? summarizeMailTesterReport(JSON.parse(await readFile(mailTesterPath, 'utf8')))
      : undefined
    return await runPreSendChecks({
      prepared,
      spamAssassin,
      ...(mailTester ? { mailTester } : {}),
      ...(fetchUrl ? { fetchUrl } : {}),
    })
  }
  const outDir = getStringFlag(parsed, 'out-dir')
  if (outDir) {
    await writeRenderedEmail(outDir, rendered)
    return {
      template: draft.template ?? 'default',
      outDir,
      html: `${outDir}/email.html`,
      text: `${outDir}/email.txt`,
    }
  }
  return {
    template: draft.template ?? 'default',
    subject: rendered.subject,
    preview: rendered.preview,
    html: rendered.html,
    text: rendered.text,
  }
}

async function draftInput(parsed: ParsedArgs): Promise<DraftInput> {
  const subject = getStringFlag(parsed, 'subject')
  if (!subject) throw new Error('Missing --subject')
  const bodyMarkdown =
    getStringFlag(parsed, 'body') ??
    (getStringFlag(parsed, 'body-file')
      ? await readFile(mustString(parsed, 'body-file'), 'utf8')
      : undefined)
  if (!bodyMarkdown) throw new Error('Missing --body or --body-file')
  return {
    subject,
    bodyMarkdown,
    ...(getStringFlag(parsed, 'name') ? { name: mustString(parsed, 'name') } : {}),
    ...(getStringFlag(parsed, 'preview')
      ? { preview: mustString(parsed, 'preview') }
      : {}),
    ...(getStringFlag(parsed, 'template')
      ? { template: mustString(parsed, 'template') }
      : {}),
  }
}

async function writeRenderedEmail(
  outDir: string,
  rendered: { html: string; text: string },
) {
  await mkdir(outDir, { recursive: true })
  await Promise.all([
    writeFile(`${outDir}/email.html`, rendered.html),
    writeFile(`${outDir}/email.txt`, rendered.text),
  ])
}

function mustString(parsed: ParsedArgs, name: string): string {
  const value = getStringFlag(parsed, name)
  if (!value) throw new Error(`Missing --${name}`)
  return value
}
