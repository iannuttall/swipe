import crypto from 'node:crypto'
import type {
  ConfirmationReport,
  ConfirmationRequestInput,
  ConfirmationRequestRecord,
  ConfirmationStore,
} from './confirmation-types.js'
import { getEmailDomain, normalizeEmail } from './email-address.js'
import type { ContactRecord, EventRecord } from './store.js'

export class MemoryConfirmationStore implements ConfirmationStore {
  readonly requests = new Map<string, ConfirmationRequestRecord>()

  constructor(
    private readonly contacts: Map<string, ContactRecord>,
    private readonly events: EventRecord[],
  ) {}

  async upsertPendingContact(input: {
    email: string
    name?: string
    attributes?: Record<string, unknown>
    source?: string
  }) {
    const email = normalizeEmail(input.email)
    const existing = this.contacts.get(email)
    if (existing?.status === 'suppressed') {
      throw new Error('Email address is suppressed')
    }
    const status: 'active' | 'pending' =
      existing?.status === 'active' ? 'active' : 'pending'
    const contact: ContactRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      email,
      emailDomain: getEmailDomain(email),
      status,
      attributes: {
        ...(existing?.attributes ?? {}),
        ...(input.attributes ?? {}),
      },
      hardBounceCount: existing?.hardBounceCount ?? 0,
      softBounceCount: existing?.softBounceCount ?? 0,
      complaintCount: existing?.complaintCount ?? 0,
      ...(input.name
        ? { name: input.name }
        : existing?.name
          ? { name: existing.name }
          : {}),
      ...(input.source
        ? { source: input.source }
        : existing?.source
          ? { source: existing.source }
          : {}),
      ...(existing?.subscribedAt ? { subscribedAt: existing.subscribedAt } : {}),
      ...(existing?.unsubscribedAt ? { unsubscribedAt: existing.unsubscribedAt } : {}),
      ...(existing?.suppressedAt ? { suppressedAt: existing.suppressedAt } : {}),
    }
    this.contacts.set(email, contact)
    return { id: contact.id, email: contact.email, status }
  }

  async createRequests(inputs: ConfirmationRequestInput[]): Promise<number> {
    let created = 0
    for (const input of inputs) {
      if (this.hasConflict(input)) continue
      const request: ConfirmationRequestRecord = {
        ...input,
        status: 'pending',
        metadata: input.metadata ?? {},
      }
      this.requests.set(request.id, request)
      this.events.push({
        id: crypto.randomUUID(),
        type: 'contact.confirmation_requested',
        contactId: request.contactId,
        source: request.source,
        occurredAt: request.requestedAt,
        idempotencyKey: `confirmation-requested:${request.id}`,
        metadata: {
          confirmationRequestId: request.id,
          purpose: request.purpose,
          ...(request.batchKey ? { batchKey: request.batchKey } : {}),
        },
      })
      created += 1
    }
    return created
  }

  async findRequest(input: {
    contactId: string
    purpose: ConfirmationRequestRecord['purpose']
    batchKey?: string
  }): Promise<ConfirmationRequestRecord | undefined> {
    return Array.from(this.requests.values())
      .filter(
        (request) =>
          request.contactId === input.contactId &&
          request.purpose === input.purpose &&
          request.batchKey === input.batchKey,
      )
      .toSorted((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())[0]
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<ConfirmationRequestRecord | undefined> {
    return Array.from(this.requests.values()).find(
      (request) => request.tokenHash === tokenHash,
    )
  }

  async confirmRequest(input: {
    id: string
    confirmedAt: Date
    confirmedIpHash?: string
    confirmedUserAgent?: string
    confirmedSourceUrl?: string
  }): Promise<ConfirmationRequestRecord | undefined> {
    const request = this.requests.get(input.id)
    if (
      request?.status !== 'pending' ||
      request.expiresAt.getTime() <= input.confirmedAt.getTime()
    ) {
      return request
    }
    request.status = 'confirmed'
    request.confirmedAt = input.confirmedAt
    if (input.confirmedIpHash) request.confirmedIpHash = input.confirmedIpHash
    if (input.confirmedUserAgent) {
      request.confirmedUserAgent = input.confirmedUserAgent
    }
    if (input.confirmedSourceUrl) {
      request.confirmedSourceUrl = input.confirmedSourceUrl
    }

    const contact = await this.contactById(request.contactId)
    if (contact && request.purpose === 'double_opt_in') {
      contact.status = 'active'
      contact.subscribedAt = input.confirmedAt
      delete contact.unsubscribedAt
      delete contact.suppressedAt
    }
    this.events.push({
      id: crypto.randomUUID(),
      type: 'contact.confirmed',
      contactId: request.contactId,
      source: request.source,
      occurredAt: input.confirmedAt,
      idempotencyKey: `confirmation-confirmed:${request.id}`,
      ...(input.confirmedUserAgent ? { userAgent: input.confirmedUserAgent } : {}),
      ...(input.confirmedIpHash ? { ipHash: input.confirmedIpHash } : {}),
      metadata: {
        confirmationRequestId: request.id,
        purpose: request.purpose,
        ...(request.batchKey ? { batchKey: request.batchKey } : {}),
      },
    })
    if (contact && request.purpose === 'double_opt_in') {
      this.events.push({
        id: crypto.randomUUID(),
        type: 'contact.subscribed',
        contactId: request.contactId,
        source: request.source,
        occurredAt: input.confirmedAt,
        idempotencyKey: `confirmation-subscribed:${request.id}`,
        metadata: {
          email: contact.email,
          confirmationRequestId: request.id,
        },
      })
    }
    return request
  }

  async expireRequest(id: string): Promise<void> {
    const request = this.requests.get(id)
    if (request?.status === 'pending') request.status = 'expired'
  }

  async report(input: {
    purpose: ConfirmationRequestRecord['purpose']
    batchKey?: string
  }): Promise<ConfirmationReport> {
    const requests = this.matching(input)
    const now = Date.now()
    let activeUnconfirmed = 0
    for (const request of requests) {
      const contact = await this.contactById(request.contactId)
      if (contact?.status === 'active' && request.status !== 'confirmed') {
        activeUnconfirmed += 1
      }
    }
    return {
      purpose: input.purpose,
      ...(input.batchKey ? { batchKey: input.batchKey } : {}),
      total: requests.length,
      pending: requests.filter(
        (request) => request.status === 'pending' && request.expiresAt.getTime() > now,
      ).length,
      confirmed: countStatus(requests, 'confirmed'),
      expired: requests.filter(
        (request) =>
          request.status === 'expired' ||
          (request.status === 'pending' && request.expiresAt.getTime() <= now),
      ).length,
      cancelled: countStatus(requests, 'cancelled'),
      activeUnconfirmed,
    }
  }

  async unsubscribeUnconfirmed(input: {
    purpose: 'swipe_migration'
    batchKey: string
    expiredBefore: Date
    source: string
    execute: boolean
  }): Promise<{ matched: number; unsubscribed: number }> {
    const contactIds = new Set(
      this.matching(input)
        .filter(
          (request) =>
            request.status !== 'confirmed' &&
            request.expiresAt.getTime() <= input.expiredBefore.getTime(),
        )
        .map((request) => request.contactId),
    )
    const contacts = Array.from(this.contacts.values()).filter(
      (contact) => contact.status === 'active' && contactIds.has(contact.id),
    )
    if (!input.execute) return { matched: contacts.length, unsubscribed: 0 }
    for (const contact of contacts) {
      contact.status = 'unsubscribed'
      contact.unsubscribedAt = new Date()
      delete contact.suppressedAt
      this.events.push({
        id: crypto.randomUUID(),
        type: 'contact.unsubscribed',
        contactId: contact.id,
        source: input.source,
        occurredAt: new Date(),
        idempotencyKey: `migration-unsubscribe:${input.batchKey}:${contact.id}`,
        metadata: {
          email: contact.email,
          confirmationPurpose: input.purpose,
          confirmationBatchKey: input.batchKey,
        },
      })
    }
    return { matched: contacts.length, unsubscribed: contacts.length }
  }

  private hasConflict(input: ConfirmationRequestInput): boolean {
    for (const request of this.requests.values()) {
      if (request.tokenHash === input.tokenHash) return true
      if (
        input.batchKey &&
        request.contactId === input.contactId &&
        request.purpose === input.purpose &&
        request.batchKey === input.batchKey
      ) {
        return true
      }
    }
    return false
  }

  private matching(input: {
    purpose: ConfirmationRequestRecord['purpose']
    batchKey?: string
  }): ConfirmationRequestRecord[] {
    return Array.from(this.requests.values()).filter(
      (request) =>
        request.purpose === input.purpose && request.batchKey === input.batchKey,
    )
  }

  private async contactById(id: string): Promise<ContactRecord | undefined> {
    return Array.from(this.contacts.values()).find((contact) => contact.id === id)
  }
}

function countStatus(
  requests: ConfirmationRequestRecord[],
  status: ConfirmationRequestRecord['status'],
): number {
  return requests.filter((request) => request.status === status).length
}
