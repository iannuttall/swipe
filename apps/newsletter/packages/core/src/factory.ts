import type { AppConfig } from './config.js'
import { loadConfig } from './config.js'
import { createDb, createDbConnection } from './db/index.js'
import { CoreEmailPlatform } from './platform.js'
import { PostgresEmailStore } from './postgres-store.js'
import type { EmailProvider } from './providers.js'
import { SesEmailProvider, TestEmailProvider } from './providers.js'
import type { EmailStore } from './store.js'

export interface PlatformFactoryInput {
  config?: AppConfig
  store?: EmailStore
  provider?: EmailProvider
}

export function createEmailPlatform(input: PlatformFactoryInput = {}) {
  const config = input.config ?? loadConfig()
  const store = input.store ?? new PostgresEmailStore(createDb(config.databaseUrl))
  const provider = input.provider ?? createEmailProvider(config)
  return new CoreEmailPlatform({ config, store, provider })
}

export function createEmailPlatformRuntime(input: PlatformFactoryInput = {}) {
  if (input.store) {
    return {
      platform: createEmailPlatform(input),
      close: async () => {},
    }
  }

  const config = input.config ?? loadConfig()
  const connection = createDbConnection(config.databaseUrl)
  const store = new PostgresEmailStore(connection.db)
  const provider = input.provider ?? createEmailProvider(config)
  return {
    platform: new CoreEmailPlatform({ config, store, provider }),
    close: connection.close,
  }
}

export function createEmailProvider(config: AppConfig): EmailProvider {
  if (config.provider === 'test') return new TestEmailProvider()
  return new SesEmailProvider(config)
}
