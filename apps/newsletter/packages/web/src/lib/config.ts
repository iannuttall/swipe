export interface WebConfig {
  appName: string
  baseUrl: string
  apiInternalUrl: string
  mainSiteName: string
  mainSiteUrl: string
}

export function getWebConfig(env: NodeJS.ProcessEnv = process.env): WebConfig {
  const appName = readEnv(env.EMAIL_APP_NAME) ?? readEnv(env.APP_NAME) ?? 'Email'
  const baseUrl = trimTrailingSlash(readEnv(env.BASE_URL) ?? 'http://localhost:3000')

  return {
    appName,
    baseUrl,
    apiInternalUrl: trimTrailingSlash(
      readEnv(env.EMAIL_API_INTERNAL_URL) ?? 'http://127.0.0.1:3000',
    ),
    mainSiteName: readEnv(env.MAIN_SITE_NAME) ?? 'Swipe',
    mainSiteUrl: trimTrailingSlash(readEnv(env.MAIN_SITE_URL) ?? 'https://swipe.md'),
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
