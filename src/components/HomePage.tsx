import { useEffect, useMemo, useState } from 'react'
import { DitherCard } from '@/components/DitherCard'
import { NewsletterForm } from '@/components/NewsletterForm'
import { Rainbow } from '@/components/ui/rainbow'
import { getCardsForSeed, type CardDef } from '@/data/home-cards'

function Lines({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

function ChatCard({ messages }: { messages: { role: 'user' | 'ai'; text: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {messages.map((message, index) => {
        const isUser = message.role === 'user'

        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-[1.55] ${
                isUser
                  ? 'bg-foreground/[0.075] text-foreground/45'
                  : 'border border-foreground/[0.09] bg-background/35 text-foreground/36'
              }`}
            >
              <Lines text={message.text} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MessageCard({
  sender,
  time,
  text,
}: {
  sender: string
  time: string
  text: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/[0.09] bg-background/35 px-3.5 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-foreground/45">{sender}</span>
        <span className="font-mono text-[10px] text-foreground/22">{time}</span>
      </div>
      <div className="text-xs leading-[1.55] text-foreground/34">
        <Lines text={text} />
      </div>
    </div>
  )
}

function WorkflowCard({
  title,
  input,
  steps,
  output,
}: {
  title: string
  input: string
  steps: string[]
  output: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/[0.09] bg-background/40">
      <div className="border-b border-foreground/[0.07] px-3.5 py-2.5 text-[13px] font-semibold text-foreground/46">
        {title}
      </div>
      <div className="px-3.5 py-3">
        <div className="mb-2.5 rounded-lg bg-foreground/[0.045] px-2.5 py-2 text-xs leading-snug text-foreground/34">
          {input}
        </div>
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2.5 text-xs leading-snug text-foreground/32">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/12 font-mono text-[9px] text-foreground/30">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2.5 border-t border-foreground/[0.07] pt-2.5 text-xs font-medium leading-snug text-foreground/42">
          → {output}
        </div>
      </div>
    </div>
  )
}

function SwipeCard({
  title,
  text,
  tryThis,
}: {
  title: string
  text: string
  tryThis: string
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.09] bg-foreground/[0.025] px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-foreground/10 text-sm text-foreground/32">
          +
        </span>
        <span className="text-[13px] font-semibold text-foreground/46">{title}</span>
      </div>
      <p className="text-xs leading-[1.55] text-foreground/34">{text}</p>
      <p className="mt-2.5 font-mono text-[10px] leading-relaxed text-foreground/28">
        Swipe this: {tryThis}
      </p>
    </div>
  )
}

function BeforeAfterCard({
  title,
  before,
  after,
}: {
  title: string
  before: string
  after: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/[0.09]">
      <div className="bg-foreground/[0.035] px-3.5 py-2.5 text-[13px] font-semibold text-foreground/46">
        {title}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 px-3.5 py-3 text-xs leading-snug">
        <span className="font-mono text-[10px] text-foreground/24">Before</span>
        <span className="text-foreground/29">{before}</span>
        <span className="font-mono text-[10px] text-foreground/36">After</span>
        <span className="font-medium text-foreground/42">{after}</span>
      </div>
    </div>
  )
}

function ResultCard({
  app,
  title,
  detail,
  status,
}: {
  app: string
  title: string
  detail: string
  status: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/[0.09] bg-background/40">
      <div className="flex items-center justify-between border-b border-foreground/[0.07] px-3.5 py-2">
        <span className="font-mono text-[10px] text-foreground/28">{app}</span>
        <span className="h-2 w-2 rounded-full bg-foreground/12" />
      </div>
      <div className="px-3.5 py-3.5">
        <div className="text-sm font-semibold leading-snug text-foreground/46">{title}</div>
        <div className="mt-1.5 text-xs leading-[1.5] text-foreground/32">{detail}</div>
        <div className="mt-3 inline-flex rounded-full border border-foreground/10 px-2.5 py-1 font-mono text-[10px] text-foreground/35">
          {status}
        </div>
      </div>
    </div>
  )
}

function hashStr(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return hash
}

function randomTime(seed: string): string {
  const hash = Math.abs(hashStr(seed))
  const hour = 8 + (hash % 10)
  const min = ((hash >> 4) % 12) * 5
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour
  return `${display}:${min.toString().padStart(2, '0')} ${ampm}`
}

function renderCard(card: CardDef) {
  switch (card.type) {
    case 'chat':
      return <ChatCard messages={card.messages} />
    case 'message':
      return (
        <MessageCard
          sender={card.sender}
          time={card.time || randomTime(card.id)}
          text={card.text}
        />
      )
    case 'workflow':
      return (
        <WorkflowCard
          title={card.title}
          input={card.input}
          steps={card.steps}
          output={card.output}
        />
      )
    case 'swipe':
      return <SwipeCard title={card.title} text={card.text} tryThis={card.tryThis} />
    case 'before-after':
      return <BeforeAfterCard title={card.title} before={card.before} after={card.after} />
    case 'result':
      return (
        <ResultCard
          app={card.app}
          title={card.title}
          detail={card.detail}
          status={card.status}
        />
      )
  }
}

function createRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const nextIndex = Math.floor(random() * (index + 1))
    ;[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]]
  }
  return copy
}

const VISUAL_GROUP: Record<CardDef['type'], string> = {
  chat: 'conversation',
  message: 'conversation',
  workflow: 'process',
  swipe: 'note',
  'before-after': 'transformation',
  result: 'result',
}

const COL_WIDTH = 280
const COL_GAP = 12
const CONTAINER_PAD = 24

function estimateColumnCount(): number {
  const available = window.innerWidth - CONTAINER_PAD
  return Math.max(1, Math.floor((available + COL_GAP) / (COL_WIDTH + COL_GAP)))
}

function interleaveForColumns(cards: CardDef[], columnCount: number, seed: number): CardDef[] {
  const totalCards = cards.length
  const rowCount = Math.ceil(totalCards / columnCount)
  const random = createRng((seed ^ (columnCount * 0x9e3779b9) ^ totalCards) >>> 0)
  const shuffled = shuffle(cards, random)
  const byType: Record<string, CardDef[]> = {}

  for (const card of shuffled) {
    const key = VISUAL_GROUP[card.type]
    ;(byType[key] ??= []).push(card)
  }

  const typeKeys = Object.keys(byType)
  const cursors: Record<string, number> = Object.fromEntries(typeKeys.map((key) => [key, 0]))
  const grid: (CardDef | undefined)[][] = []
  const typeGrid: (string | undefined)[][] = []

  let placed = 0
  for (let row = 0; row < rowCount && placed < totalCards; row++) {
    grid.push(new Array(columnCount).fill(undefined))
    typeGrid.push(new Array(columnCount).fill(undefined))

    for (let column = 0; column < columnCount && placed < totalCards; column++) {
      const above = row > 0 ? typeGrid[row - 1][column] : undefined
      const left = column > 0 ? typeGrid[row][column - 1] : undefined
      const available = typeKeys.filter((type) => cursors[type] < byType[type].length)
      const ideal = available.filter((type) => type !== above && type !== left)
      const acceptable = available.filter((type) => type !== above || type !== left)
      const pool = ideal.length > 0 ? ideal : acceptable.length > 0 ? acceptable : available

      if (pool.length > 0) {
        const pick = pool[Math.floor(random() * pool.length)]
        grid[row][column] = byType[pick][cursors[pick]]
        typeGrid[row][column] = pick
        cursors[pick]++
        placed++
      }
    }
  }

  const result: CardDef[] = []
  for (let column = 0; column < columnCount; column++) {
    for (const row of grid) {
      const card = row[column]
      if (card) result.push(card)
    }
  }

  return result
}

export function HomePage() {
  const [seed, setSeed] = useState(0)
  const [columnCount, setColumnCount] = useState(5)

  useEffect(() => {
    const updateColumnCount = () => setColumnCount(estimateColumnCount())
    updateColumnCount()
    window.addEventListener('resize', updateColumnCount)
    return () => window.removeEventListener('resize', updateColumnCount)
  }, [])

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 0x7fffffff))
  }, [])

  const selectedCards = useMemo(() => getCardsForSeed(seed), [seed])
  const cards = useMemo(
    () => interleaveForColumns(selectedCards, columnCount, seed),
    [selectedCards, columnCount, seed],
  )

  return (
    <main className="relative h-dvh overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `
            linear-gradient(to right, var(--bg) 0%, transparent 6%, transparent 94%, var(--bg) 100%),
            linear-gradient(to bottom, var(--bg) 0%, transparent 4%, transparent 96%, var(--bg) 100%)
          `,
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-8">
        <div
          className="pointer-events-auto w-full max-w-[620px] rounded-xl bg-[var(--bg)] p-2.5 sm:p-3.5"
          style={{ boxShadow: '0 0 76px 52px var(--bg)' }}
        >
          <DitherCard className="w-full" stripSize={20}>
            <h1 className="mb-4 font-heading text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[2.65rem]">
              Swipe AI skills and workflows that work.
            </h1>
            <p className="mb-6 max-w-[30rem] text-[1.15rem] leading-[1.45] sm:text-[1.3rem]">
              <Rainbow as="em" invert animated className="font-mono font-semibold">
                The
              </Rainbow>{' '}
              weekly newsletter that helps you learn AI by actually doing cool things with it.
            </p>
            <NewsletterForm
              source="home_v2_cta"
              buttonText="Subscribe"
              buttonVariant="primary"
              buttonClassName="subscribe-button h-12 px-6 font-heading text-base font-semibold normal-case tracking-normal text-white"
              inputClassName="h-12 text-base"
            />
          </DitherCard>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="p-3"
        style={{
          columnWidth: COL_WIDTH,
          columnGap: COL_GAP,
          height: '150dvh',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className="overflow-hidden"
            style={{
              breakInside: 'avoid',
              marginBottom: COL_GAP,
            }}
          >
            {renderCard(card)}
          </div>
        ))}
      </div>
    </main>
  )
}
