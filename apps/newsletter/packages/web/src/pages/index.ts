import { getWebConfig } from '@/lib/config'

export function GET() {
  return Response.redirect(getWebConfig().mainSiteUrl, 301)
}
