export function linkMetadata(
  originalUrl: string,
  linkIndex: number,
  draftMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const parsed = parseUrlMetadata(originalUrl)
  const tagged = configuredLinkMetadata(originalUrl, linkIndex, draftMetadata)
  return {
    ...parsed,
    ...tagged,
    tags: mergeStringArrays(parsed.tags, tagged.tags),
    topics: mergeStringArrays(parsed.topics, tagged.topics),
  }
}

export function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&#x22;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
}

function parseUrlMetadata(originalUrl: string): Record<string, unknown> {
  try {
    const url = new URL(originalUrl)
    return {
      urlHost: url.hostname.toLowerCase(),
      urlPath: url.pathname,
      ...(url.searchParams.get('utm_source')
        ? { utmSource: url.searchParams.get('utm_source') }
        : {}),
      ...(url.searchParams.get('utm_medium')
        ? { utmMedium: url.searchParams.get('utm_medium') }
        : {}),
      ...(url.searchParams.get('utm_campaign')
        ? { utmCampaign: url.searchParams.get('utm_campaign') }
        : {}),
      ...(url.searchParams.get('utm_content')
        ? { utmContent: url.searchParams.get('utm_content') }
        : {}),
      tags: stringList(url.searchParams.get('tags')),
      topics: stringList(url.searchParams.get('topics')),
    }
  } catch {
    return {}
  }
}

function configuredLinkMetadata(
  originalUrl: string,
  linkIndex: number,
  draftMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const fromArray = Array.isArray(draftMetadata.links)
    ? draftMetadata.links.find((item) => {
        if (!item || typeof item !== 'object') return false
        const candidate = item as Record<string, unknown>
        return candidate.url === originalUrl || candidate.index === linkIndex
      })
    : undefined
  const fromTagsByUrl = metadataRecord(draftMetadata.linkTags)?.[originalUrl]
  const fromTagsByIndex = metadataRecord(draftMetadata.linkTags)?.[String(linkIndex)]
  const fromTopicsByUrl = metadataRecord(draftMetadata.linkTopics)?.[originalUrl]
  const fromTopicsByIndex = metadataRecord(draftMetadata.linkTopics)?.[String(linkIndex)]

  return {
    ...(fromArray && typeof fromArray === 'object'
      ? (fromArray as Record<string, unknown>)
      : {}),
    tags: [
      ...stringArray((fromArray as Record<string, unknown> | undefined)?.tags),
      ...stringArray(fromTagsByUrl),
      ...stringArray(fromTagsByIndex),
    ],
    topics: [
      ...stringArray((fromArray as Record<string, unknown> | undefined)?.topics),
      ...stringArray(fromTopicsByUrl),
      ...stringArray(fromTopicsByIndex),
    ],
  }
}

function metadataRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function mergeStringArrays(a: unknown, b: unknown): string[] {
  return Array.from(new Set([...stringArray(a), ...stringArray(b)]))
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') return stringList(value)
  return []
}

function stringList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
