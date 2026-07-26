export class ProviderAcceptedPersistenceError extends Error {
  constructor(
    readonly result: { provider: string; providerMessageId: string },
    cause: unknown,
  ) {
    super('Provider accepted message but local persistence failed', { cause })
  }
}
