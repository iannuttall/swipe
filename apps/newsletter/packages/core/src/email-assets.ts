const defaultAssetBaseUrl = 'https://swipe.md'

export function emailAssetUrl(path: string): string {
  const configured = process.env.SWIPE_EMAIL_ASSET_BASE_URL?.trim()
  const baseUrl = (configured || defaultAssetBaseUrl).replace(/\/+$/, '')
  return `${baseUrl}/${path.replace(/^\/+/, '')}`
}
