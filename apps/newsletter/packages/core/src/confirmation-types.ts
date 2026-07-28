import type { ContactInput } from './types.js'

export type ConfirmationPurpose = 'double_opt_in' | 'swipe_invite' | 'swipe_migration'
export type ConfirmationStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled'

export interface ConfirmationRequestRecord {
  id: string
  contactId: string
  purpose: ConfirmationPurpose
  batchKey?: string
  tokenHash: string
  status: ConfirmationStatus
  source: string
  requestedAt: Date
  expiresAt: Date
  confirmedAt?: Date
  confirmedIpHash?: string
  confirmedUserAgent?: string
  confirmedSourceUrl?: string
  metadata: Record<string, unknown>
}

export interface ConfirmationRequestInput {
  id: string
  contactId: string
  purpose: ConfirmationPurpose
  batchKey?: string
  tokenHash: string
  source: string
  requestedAt: Date
  expiresAt: Date
  metadata?: Record<string, unknown>
}

export interface ConfirmationReport {
  purpose: ConfirmationPurpose
  batchKey?: string
  total: number
  pending: number
  confirmed: number
  expired: number
  cancelled: number
  activeUnconfirmed: number
}

export interface ConfirmationStore {
  upsertPendingContact(input: ContactInput): Promise<{
    id: string
    email: string
    status: 'active' | 'pending'
  }>
  createRequests(inputs: ConfirmationRequestInput[]): Promise<number>
  findRequest(input: {
    contactId: string
    purpose: ConfirmationPurpose
    batchKey?: string
  }): Promise<ConfirmationRequestRecord | undefined>
  findByTokenHash(tokenHash: string): Promise<ConfirmationRequestRecord | undefined>
  confirmRequest(input: {
    id: string
    confirmedAt: Date
    confirmedIpHash?: string
    confirmedUserAgent?: string
    confirmedSourceUrl?: string
  }): Promise<{
    request?: ConfirmationRequestRecord
    newlyConfirmed: boolean
  }>
  expireRequest(id: string): Promise<void>
  report(input: {
    purpose: ConfirmationPurpose
    batchKey?: string
  }): Promise<ConfirmationReport>
  unsubscribeUnconfirmed(input: {
    purpose: 'swipe_migration'
    batchKey: string
    expiredBefore: Date
    source: string
    execute: boolean
  }): Promise<{ matched: number; unsubscribed: number }>
}
