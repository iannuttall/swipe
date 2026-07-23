import { useEffect, useMemo, useState } from 'react'
import { DitherCard } from '@/components/DitherCard'
import { NewsletterForm } from '@/components/NewsletterForm'
import { InlineCode } from '@/components/ui/inline-code'
import { Rainbow } from '@/components/ui/rainbow'
import { Text } from '@/components/ui/text'
import { getCardsForSeed, type CardDef } from '@/data/home-cards'

function Lines({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

function TerminalCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.03]">
      <div className="flex items-center gap-1.5 border-b border-foreground/[0.06] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-foreground/25">{title}</span>
      </div>
      <div className="px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/30">
        <Lines text={text} />
      </div>
    </div>
  )
}

function ChatCard({ messages }: { messages: { role: 'user' | 'ai'; text: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {messages.map((message, i) => {
        const isUser = message.role === 'user'
        const lines = message.text.split('\n').filter((line) => line.length > 0)

        return (
          <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed ${
                isUser
                  ? 'bg-foreground/[0.07] text-foreground/35'
                  : 'border border-foreground/[0.07] text-foreground/25'
              }`}
            >
              {lines.map((line, j) => (
                <p key={j} className={j > 0 ? 'mt-1.5' : ''}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FileCard({ filename, text }: { filename: string; text: string }) {
  return (
    <div className="overflow-hidden rounded border border-foreground/[0.07]">
      <div className="flex items-stretch border-b border-foreground/[0.06] bg-foreground/[0.03]">
        <div className="border-r border-foreground/[0.06] px-3 py-1 font-mono text-[10px] text-foreground/30">
          {filename}
        </div>
      </div>
      <div className="px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/30">
        <Lines text={text} />
      </div>
    </div>
  )
}

function MessageCard({ sender, time, text }: { sender: string; time: string; text: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded border border-foreground/[0.07] px-3 py-2.5">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] font-medium text-foreground/30">{sender}</span>
        <span className="font-mono text-[9px] text-foreground/15">{time}</span>
      </div>
      <div className="font-mono text-[11px] leading-relaxed text-foreground/25">
        <Lines text={text} />
      </div>
    </div>
  )
}

function PlanCard({
  question,
  options,
  selected = 0,
}: {
  question: string
  options: { label: string; desc: string }[]
  selected?: number
}) {
  return (
    <div className="overflow-hidden rounded border border-foreground/[0.07] px-3 py-2.5">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-foreground/15">plan mode</div>
      <div className="mb-2 font-mono text-[11px] font-medium leading-relaxed text-foreground/35">
        {question}
      </div>
      <div className="flex flex-col gap-1">
        {options.map((option, i) => {
          const isSelected = i === selected
          return (
            <div key={i} className="font-mono text-[10px] leading-relaxed">
              <div className={isSelected ? 'text-foreground/40' : 'text-foreground/25'}>
                <span className="inline-block w-4 text-foreground/15">{isSelected ? '›' : '\u00A0'}</span>
                {i + 1}. {option.label}
              </div>
              <div className="ml-4 pl-2 text-[9px] text-foreground/15">{option.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TERMINALS = ['ghostty', 'terminal', 'iterm2', 'warp']

function CliCard({
  terminal,
  tool,
  command,
  diff,
}: {
  terminal?: string
  tool: string
  command: string
  diff: string
}) {
  const termName = terminal || TERMINALS[Math.abs(hashStr(tool + command)) % TERMINALS.length]
  const diffLines = diff.split('\n')
  const fileHeader = diffLines[0]
  const codeLines = diffLines.slice(1)

  return (
    <div className="flex flex-col overflow-hidden rounded border border-foreground/[0.07] bg-foreground/[0.03]">
      <div className="flex items-center gap-1.5 border-b border-foreground/[0.06] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-foreground/25">{termName}</span>
      </div>

      <div className="px-3 py-2.5">
        <div className="mb-2 font-mono text-[11px] text-foreground/30">$ {tool}</div>
        <div className="mb-2 border-b border-foreground/[0.06] pb-2 font-mono text-[11px] leading-relaxed text-foreground/35">
          &gt; <Lines text={command} />
        </div>
        <div className="mb-1 font-mono text-[9px] text-foreground/20">{fileHeader}</div>
        <div className="font-mono text-[10px] leading-relaxed">
          {codeLines.map((line, i) => {
            const isAdd = line.startsWith('+')
            const isRemove = line.startsWith('-')

            return (
              <div
                key={i}
                className={
                  isRemove
                    ? 'bg-red-500/8 text-red-500/50'
                    : isAdd
                      ? 'bg-green-500/8 text-green-500/50'
                      : 'text-foreground/20'
                }
                style={{ paddingLeft: 4, paddingRight: 4, marginLeft: -4, marginRight: -4 }}
              >
                {line || '\u00A0'}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function hashStr(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0
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
    case 'terminal':
      return <TerminalCard title={card.title} text={card.text} />
    case 'chat':
      return <ChatCard messages={card.messages} />
    case 'file':
      return <FileCard filename={card.filename} text={card.text} />
    case 'message':
      return <MessageCard sender={card.sender} time={card.time || randomTime(card.id)} text={card.text} />
    case 'cli':
      return <CliCard terminal={card.terminal} tool={card.tool} command={card.command} diff={card.diff} />
    case 'plan':
      return <PlanCard question={card.question} options={card.options} selected={card.selected} />
  }
}

function createRng(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const VISUAL_GROUP: Record<string, string> = {
  terminal: 'terminal',
  file: 'file',
  chat: 'message',
  message: 'message',
  cli: 'terminal',
  plan: 'message',
}

const COL_WIDTH = 260
const COL_GAP = 10
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
    const key = VISUAL_GROUP[card.type] ?? card.type
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

    for (let col = 0; col < columnCount && placed < totalCards; col++) {
      const above = row > 0 ? typeGrid[row - 1][col] : undefined
      const left = col > 0 ? typeGrid[row][col - 1] : undefined
      const available = typeKeys.filter((type) => cursors[type] < byType[type].length)
      const ideal = available.filter((type) => type !== above && type !== left)
      const okish = available.filter((type) => type !== above || type !== left)
      const pool = ideal.length > 0 ? ideal : okish.length > 0 ? okish : available

      if (pool.length > 0) {
        const pick = pool[Math.floor(random() * pool.length)]
        grid[row][col] = byType[pick][cursors[pick]]
        typeGrid[row][col] = pick
        cursors[pick]++
        placed++
      }
    }
  }

  const result: CardDef[] = []
  for (let col = 0; col < columnCount; col++) {
    for (let row = 0; row < grid.length; row++) {
      const card = grid[row][col]
      if (card) result.push(card)
    }
  }

  return result
}

export function HomePage() {
  const [seed] = useState(() => Math.floor(Math.random() * 0x7fffffff))
  const [colCount, setColCount] = useState(5)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setColCount(estimateColumnCount())
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const selectedCards = useMemo(() => getCardsForSeed(seed), [seed])
  const cards = useMemo(
    () => interleaveForColumns(selectedCards, colCount, seed),
    [selectedCards, colCount, seed],
  )

  return (
    <div className={`relative h-dvh overflow-hidden transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `
            linear-gradient(to right, var(--bg) 0%, transparent 6%, transparent 94%, var(--bg) 100%),
            linear-gradient(to bottom, var(--bg) 0%, transparent 4%, transparent 96%, var(--bg) 100%)
          `,
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
        <div
          className="pointer-events-auto rounded-lg bg-[var(--bg)] p-3"
          style={{ boxShadow: '0 0 60px 40px var(--bg)' }}
        >
          <DitherCard className="w-full max-w-md">
            <Text variant="body" className="mb-1 text-xl font-medium">
              Subscribe to <InlineCode>SWIPE.md</InlineCode>
            </Text>
            <Text variant="body" className="mb-4">
              <Rainbow as="em" invert animated className="font-bold">The</Rainbow> newsletter for people who want to do cool things with AI. No FOMO.
            </Text>
            <NewsletterForm
              source="home_v2_cta"
              buttonText="let me in!"
              buttonVariant="primary"
              buttonClassName="h-11 px-5 text-sm normal-case italic tracking-normal font-medium"
              inputClassName="h-11 text-base"
            />
          </DitherCard>
        </div>
      </div>

      <div
        className="p-3 grayscale"
        style={{
          columnWidth: 260,
          columnGap: 10,
          height: '140dvh',
        }}
      >
        {cards.map((card, i) => (
          <div
            key={`${card.id}-${i}`}
            className="overflow-hidden"
            style={{
              breakInside: 'avoid',
              marginBottom: 10,
            }}
          >
            {renderCard(card)}
          </div>
        ))}
      </div>
    </div>
  )
}
