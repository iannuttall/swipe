import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import type { AppConfig } from './config.js'
import { requireSecret } from './config.js'

export interface ProviderSendInput {
  to: string
  fromEmail: string
  fromName?: string
  replyTo?: string
  subject: string
  html: string
  text: string
  headers?: Array<{ name: string; value: string }>
  metadata?: Record<string, unknown>
}

export interface ProviderSendResult {
  provider: string
  providerMessageId: string
}

export interface EmailProvider {
  id: string
  send(input: ProviderSendInput): Promise<ProviderSendResult>
}

export class TestEmailProvider implements EmailProvider {
  readonly id = 'test'
  readonly sent: ProviderSendInput[] = []

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    this.sent.push(input)
    return {
      provider: this.id,
      providerMessageId: `test_${this.sent.length}`,
    }
  }
}

export class SesEmailProvider implements EmailProvider {
  readonly id = 'ses'
  private readonly client: SESv2Client
  private readonly config: AppConfig

  constructor(config: AppConfig, client?: SESv2Client) {
    this.config = config
    const explicitCredentials =
      config.aws.accessKeyId && config.aws.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.aws.accessKeyId,
              secretAccessKey: config.aws.secretAccessKey,
            },
          }
        : {}
    this.client =
      client ??
      new SESv2Client({
        region: config.aws.region,
        ...explicitCredentials,
      })
  }

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const source = formatSource(input.fromEmail, input.fromName)
    const command = new SendEmailCommand({
      FromEmailAddress: source,
      Destination: {
        ToAddresses: [input.to],
      },
      ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            Text: { Data: input.text, Charset: 'UTF-8' },
          },
          Headers: input.headers?.map((header) => ({
            Name: header.name,
            Value: header.value,
          })),
        },
      },
    })
    const response = await this.client.send(command)
    return {
      provider: this.id,
      providerMessageId: requireSecret(response.MessageId, 'SES MessageId'),
    }
  }

  defaultFromEmail(): string {
    return requireSecret(this.config.email.fromEmail, 'EMAIL_FROM_EMAIL')
  }

  defaultFromName(): string | undefined {
    return this.config.email.fromName
  }
}

function formatSource(email: string, name?: string): string {
  if (!name) return email
  return `"${name.replaceAll('"', '\\"')}" <${email}>`
}
