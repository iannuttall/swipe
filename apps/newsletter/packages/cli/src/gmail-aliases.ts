export function gmailAliases(input: {
  email: string
  count: number
  start: number
  width: number
  prefix: string
}): string[] {
  const [local, domain] = input.email.split('@')
  if (!local || !domain) throw new Error('Missing valid --email')
  return Array.from({ length: input.count }, (_, index) => {
    const number = String(input.start + index).padStart(input.width, '0')
    return `${local}+${input.prefix}${number}@${domain}`
  })
}
