import type { EmailPlatform } from '@email/core'
import { gmailAliases } from './gmail-aliases.js'

export interface SeedIntelligenceInput {
  email: string
  count: number
  start: number
  width: number
  prefix: string
  source: string
}

export interface SeededIntelligenceContact {
  email: string
  tags: string[]
  externalId: string
  purchase?: {
    productKey: string
    amountCents: number
    currency: string
  }
}

const PRODUCT_KEYS = ['prompt-stack', 'social-agent', 'devtools-playbook'] as const
const INTEREST_TAGS = ['interest-ai-agents', 'interest-devtools', 'interest-automation']

export async function seedGmailSubscriberIntelligence(
  platform: EmailPlatform,
  input: SeedIntelligenceInput,
) {
  const aliases = gmailAliases(input)
  const imported = await platform.importContacts({
    contacts: aliases.map((email) => ({
      email,
      source: input.source,
      attributes: { seed: 'subscriber-intelligence', baseEmail: input.email },
    })),
  })
  const contacts: SeededIntelligenceContact[] = []

  for (const [index, email] of aliases.entries()) {
    contacts.push(await seedContact(platform, input, email, index))
  }

  return {
    ...imported,
    contacts,
    tagged: contacts.reduce((total, contact) => total + contact.tags.length, 0),
    externalIds: contacts.length,
    purchases: contacts.filter((contact) => contact.purchase).length,
    suggestedCommands: [
      'email audience preview --contact-tag high-value --json',
      'email audience preview --purchased-product prompt-stack --currency USD --json',
      'email audience preview --min-ltv-cents 50000 --currency USD --json',
    ],
  }
}

async function seedContact(
  platform: EmailPlatform,
  input: SeedIntelligenceInput,
  email: string,
  index: number,
): Promise<SeededIntelligenceContact> {
  const ordinal = input.start + index
  const interest = INTEREST_TAGS[index % INTEREST_TAGS.length] ?? 'interest-general'
  const tags = ['local-test', interest]
  if (ordinal % 4 === 0) tags.push('high-value')
  if (ordinal % 5 === 0) tags.push('vip')

  for (const tagKey of tags) {
    await platform.tagContact({
      emailOrId: email,
      tagKey,
      source: input.source,
      metadata: { seed: 'subscriber-intelligence' },
    })
  }

  const externalId = `${input.prefix}_${String(ordinal).padStart(input.width, '0')}`
  await platform.upsertContactExternalId({
    emailOrId: email,
    provider: input.source,
    externalId,
    label: 'Gmail alias seed',
    metadata: { baseEmail: input.email },
  })

  return {
    email,
    tags,
    externalId,
    ...(ordinal % 3 === 0
      ? { purchase: await seedPurchase(platform, input, email, ordinal) }
      : {}),
  }
}

async function seedPurchase(
  platform: EmailPlatform,
  input: SeedIntelligenceInput,
  email: string,
  ordinal: number,
) {
  const productKey = PRODUCT_KEYS[ordinal % PRODUCT_KEYS.length] ?? 'prompt-stack'
  const amountCents = ordinal % 4 === 0 ? 100_000 : 25_000 + ordinal * 100
  const purchase = await platform.recordPurchase({
    email,
    provider: input.source,
    externalId: `purchase_${input.prefix}_${ordinal}`,
    idempotencyKey: `${input.source}:${input.prefix}:${ordinal}`,
    productKey,
    productName: productKey,
    amountCents,
    currency: 'USD',
    metadata: { seed: 'subscriber-intelligence' },
  })
  return {
    productKey: purchase.productKey,
    amountCents: purchase.amountCents,
    currency: purchase.currency,
  }
}
