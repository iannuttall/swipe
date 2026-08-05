import { eq, sql } from 'drizzle-orm'
import type { Database } from './db/index.js'
import { drafts } from './db/schema.js'
import { mapDraft } from './postgres-store-mappers.js'
import type { DraftRecord } from './store.js'
import type { DraftInput } from './types.js'

export async function createPostgresDraft(
  db: Database,
  input: DraftInput,
): Promise<DraftRecord> {
  const [row] = await db
    .insert(drafts)
    .values({
      subject: input.subject,
      bodyMarkdown: input.bodyMarkdown,
      template: input.template ?? 'default',
      metadata: input.metadata ?? {},
      ...(input.name ? { name: input.name } : {}),
      ...(input.preview ? { preview: input.preview } : {}),
      ...(input.fromEmail ? { fromEmail: input.fromEmail } : {}),
      ...(input.fromName ? { fromName: input.fromName } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    })
    .returning()
  if (!row) throw new Error('Failed to create draft')
  return mapDraft(row)
}

export async function getPostgresDraft(
  db: Database,
  id: string,
): Promise<DraftRecord | undefined> {
  const [row] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1)
  return row ? mapDraft(row) : undefined
}

export async function updatePostgresDraft(
  db: Database,
  input: {
    id: string
    status?: DraftRecord['status']
    metadata?: Record<string, unknown>
  },
): Promise<DraftRecord> {
  const [row] = await db
    .update(drafts)
    .set({
      ...(input.status ? { status: input.status } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(drafts.id, input.id))
    .returning()
  if (!row) throw new Error(`Draft not found: ${input.id}`)
  return mapDraft(row)
}
