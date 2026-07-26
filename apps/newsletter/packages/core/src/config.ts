import { z } from 'zod'

const integerString = z
  .string()
  .regex(/^\d+$/)
  .transform((value) => Number.parseInt(value, 10))

const positiveIntegerString = integerString.pipe(z.number().int().positive())

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true')

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  APP_NAME: z.string().min(1).optional(),
  EMAIL_APP_NAME: z.string().min(1).optional(),
  DATABASE_URL: z.string().optional(),
  BASE_URL: z.string().url().optional(),
  API_TOKEN: z.string().optional(),
  UNSUBSCRIBE_SECRET: z.string().optional(),
  TRACKING_SECRET: z.string().optional(),
  EMAIL_PROVIDER: z.enum(['ses', 'test']).optional(),
  EMAIL_FROM_EMAIL: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_BATCH_SIZE: integerString.optional(),
  EMAIL_BATCH_DURATION_MINUTES: integerString.optional(),
  EMAIL_SEND_DURATION_HOURS: integerString.optional(),
  EMAIL_SEND_RATE_PER_SECOND: positiveIntegerString.optional(),
  EMAIL_TRACK_OPENS: booleanString.optional(),
  SOFT_BOUNCE_THRESHOLD: integerString.optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SNS_WEBHOOK_SECRET: z.string().optional(),
  AWS_SNS_ALLOWED_TOPICS: z.string().optional(),
  AWS_SNS_ALLOWED_CERT_HOST_SUFFIXES: z.string().optional(),
  AWS_SNS_ALLOWED_SUBSCRIBE_HOST_SUFFIXES: z.string().optional(),
})

export type AppConfig = ReturnType<typeof loadConfig>

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env)
  const isTest = parsed.NODE_ENV === 'test'
  if (!isTest) {
    rejectPlaceholderSecrets({
      API_TOKEN: parsed.API_TOKEN,
      UNSUBSCRIBE_SECRET: parsed.UNSUBSCRIBE_SECRET,
      TRACKING_SECRET: parsed.TRACKING_SECRET,
      AWS_SNS_WEBHOOK_SECRET: parsed.AWS_SNS_WEBHOOK_SECRET,
    })
  }
  const baseUrl = parsed.BASE_URL ?? 'http://localhost:3000'
  const devSecret = isTest ? 'test-secret' : undefined

  return {
    appName: parsed.EMAIL_APP_NAME ?? parsed.APP_NAME ?? 'Email',
    env: parsed.NODE_ENV ?? 'development',
    isTest,
    databaseUrl:
      parsed.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/email',
    baseUrl,
    apiToken: parsed.API_TOKEN ?? devSecret,
    unsubscribeSecret: parsed.UNSUBSCRIBE_SECRET ?? devSecret,
    trackingSecret: parsed.TRACKING_SECRET ?? devSecret,
    tracking: {
      trackOpens: parsed.EMAIL_TRACK_OPENS ?? true,
    },
    provider: parsed.EMAIL_PROVIDER ?? 'ses',
    email: {
      fromEmail: parsed.EMAIL_FROM_EMAIL,
      fromName: parsed.EMAIL_FROM_NAME,
    },
    delivery: {
      batchSize: parsed.EMAIL_BATCH_SIZE ?? 1000,
      batchDurationMinutes: parsed.EMAIL_BATCH_DURATION_MINUTES ?? 60,
      defaultDurationHours: parsed.EMAIL_SEND_DURATION_HOURS ?? 20,
      maxProviderRatePerSecond: parsed.EMAIL_SEND_RATE_PER_SECOND ?? 14,
      defaultStrategy: 'warm_first' as const,
    },
    bounce: {
      softBounceThreshold: parsed.SOFT_BOUNCE_THRESHOLD ?? 3,
    },
    aws: {
      region: parsed.AWS_REGION ?? 'us-east-1',
      accessKeyId: parsed.AWS_ACCESS_KEY_ID,
      secretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
      snsWebhookSecret: parsed.AWS_SNS_WEBHOOK_SECRET,
      snsAllowedTopics: (parsed.AWS_SNS_ALLOWED_TOPICS ?? '')
        .split(',')
        .map((topic) => topic.trim())
        .filter(Boolean),
      snsAllowedCertHostSuffixes: listOrDefault(
        parsed.AWS_SNS_ALLOWED_CERT_HOST_SUFFIXES,
        ['amazonaws.com', 'amazonaws.com.cn'],
      ),
      snsAllowedSubscribeHostSuffixes: listOrDefault(
        parsed.AWS_SNS_ALLOWED_SUBSCRIBE_HOST_SUFFIXES,
        ['amazonaws.com', 'amazonaws.com.cn'],
      ),
    },
  }
}

export function requireSecret(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required secret: ${name}`)
  }
  return value
}

function listOrDefault(value: string | undefined, defaults: string[]): string[] {
  const parsed = (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return parsed.length ? parsed : defaults
}

function rejectPlaceholderSecrets(secrets: Record<string, string | undefined>): void {
  for (const [name, value] of Object.entries(secrets)) {
    if (value && isPlaceholderSecret(value)) {
      throw new Error(`${name} must not use a placeholder secret`)
    }
  }
}

function isPlaceholderSecret(value: string): boolean {
  return ['replace-me', 'changeme', 'change-me', 'test-secret'].includes(
    value.trim().toLowerCase(),
  )
}
