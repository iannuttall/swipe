import { getCardsForSeed, type CardDef, type CardVersion } from '@/data/home-cards'

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

function TerminalCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/[0.09] bg-foreground/[0.03]">
      <div className="flex items-center gap-1.5 border-b border-foreground/[0.07] px-3.5 py-2">
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-foreground/25">
          {title}
        </span>
      </div>
      <div className="px-3.5 py-3 font-mono text-[11px] leading-relaxed text-foreground/32">
        <Lines text={text} />
      </div>
    </div>
  )
}

function FileCard({ filename, text }: { filename: string; text: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/[0.09] bg-background/40">
      <div className="flex items-stretch border-b border-foreground/[0.07] bg-foreground/[0.03]">
        <div className="border-r border-foreground/[0.07] px-3.5 py-1.5 font-mono text-[10px] text-foreground/32">
          {filename}
        </div>
      </div>
      <div className="px-3.5 py-3 font-mono text-[11px] leading-relaxed text-foreground/30">
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
    <div className="overflow-hidden rounded-xl border border-foreground/[0.09] bg-background/40 px-3.5 py-3">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-foreground/20">
        plan mode
      </div>
      <div className="mb-2 font-mono text-[11px] font-medium leading-relaxed text-foreground/42">
        {question}
      </div>
      <div className="flex flex-col gap-1">
        {options.map((option, index) => {
          const isSelected = index === selected
          return (
            <div key={index} className="font-mono text-[10px] leading-relaxed">
              <div className={isSelected ? 'text-foreground/42' : 'text-foreground/26'}>
                <span className="inline-block w-4 text-foreground/18">
                  {isSelected ? '›' : ' '}
                </span>
                {index + 1}. {option.label}
              </div>
              <div className="ml-4 pl-2 text-[9px] text-foreground/18">{option.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CLI_TERMINALS = ['ghostty', 'terminal', 'iterm2', 'warp']

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
  const termName =
    terminal || CLI_TERMINALS[Math.abs(hashStr(tool + command)) % CLI_TERMINALS.length]
  const diffLines = diff.split('\n')
  const fileHeader = diffLines[0]
  const codeLines = diffLines.slice(1)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/[0.09] bg-foreground/[0.03]">
      <div className="flex items-center gap-1.5 border-b border-foreground/[0.07] px-3.5 py-2">
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="h-2 w-2 rounded-full bg-foreground/10" />
        <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-foreground/25">
          {termName}
        </span>
      </div>

      <div className="px-3.5 py-3">
        <div className="mb-2 font-mono text-[11px] text-foreground/32">$ {tool}</div>
        <div className="mb-2 border-b border-foreground/[0.07] pb-2 font-mono text-[11px] leading-relaxed text-foreground/38">
          &gt; <Lines text={command} />
        </div>
        <div className="mb-1 font-mono text-[9px] text-foreground/22">{fileHeader}</div>
        <div className="font-mono text-[10px] leading-relaxed">
          {codeLines.map((line, index) => {
            const isAdd = line.startsWith('+')
            const isRemove = line.startsWith('-')

            return (
              <div
                key={index}
                className={
                  isRemove
                    ? 'bg-red-500/8 text-red-500/50'
                    : isAdd
                      ? 'bg-green-500/8 text-green-500/50'
                      : 'text-foreground/22'
                }
                style={{ paddingLeft: 4, paddingRight: 4, marginLeft: -4, marginRight: -4 }}
              >
                {line || ' '}
              </div>
            )
          })}
        </div>
      </div>
    </div>
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

function OutputLines({ output }: { output: string | string[] }) {
  if (!Array.isArray(output)) return <>{output}</>
  return (
    <div className="flex flex-col gap-1">
      {output.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  )
}

function WorkflowCard({
  id,
  title,
  input,
  steps,
  output,
}: {
  id: string
  title: string
  input: string
  steps: string[]
  output: string | string[]
}) {
  const variant = Math.abs(hashStr(id)) % 2

  if (variant === 1) {
    return (
      <div className="overflow-hidden rounded-xl border border-foreground/[0.09] bg-background/40">
        <div className="px-3.5 pb-2 pt-3 text-[13px] font-semibold text-foreground/46">
          {title}
        </div>
        <div className="grid grid-cols-[3.25rem_1fr] border-t border-foreground/[0.07] text-xs leading-snug">
          <span className="px-3 py-2.5 font-mono text-[9px] text-foreground/22">Give it</span>
          <span className="border-l border-foreground/[0.07] px-3 py-2.5 text-foreground/31">
            {input}
          </span>
          <span className="border-t border-foreground/[0.07] px-3 py-2.5 font-mono text-[9px] text-foreground/22">
            It does
          </span>
          <span className="border-l border-t border-foreground/[0.07] px-3 py-2.5 text-foreground/31">
            {steps.join(' · ')}
          </span>
          <span className="border-t border-foreground/[0.07] px-3 py-2.5 font-mono text-[9px] text-foreground/28">
            You get
          </span>
          <span className="border-l border-t border-foreground/[0.07] px-3 py-2.5 font-medium text-foreground/43">
            <OutputLines output={output} />
          </span>
        </div>
      </div>
    )
  }

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
          {Array.isArray(output) ? <OutputLines output={output} /> : <>→ {output}</>}
        </div>
      </div>
    </div>
  )
}

function SkillCard({
  title,
  giveIt,
  learns,
  result,
  output,
}: {
  title: string
  giveIt: string
  learns: string
  result?: string
  output?: string[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/[0.09] bg-background/40">
      <div className="flex items-center gap-2 border-b border-foreground/[0.07] px-3.5 py-2.5">
        <span className="font-mono text-[9px] text-foreground/25">Agent skill</span>
        <span className="h-px flex-1 bg-foreground/[0.07]" />
      </div>
      <div className="px-3.5 py-3.5">
        <div className="text-sm font-semibold leading-snug text-foreground/48">{title}</div>
        <dl className="mt-3 grid grid-cols-[3.4rem_1fr] gap-x-2.5 gap-y-2 text-xs leading-snug">
          <dt className="font-mono text-[9px] text-foreground/22">Give it</dt>
          <dd className="m-0 text-foreground/31">{giveIt}</dd>
          <dt className="font-mono text-[9px] text-foreground/22">It learns</dt>
          <dd className="m-0 text-foreground/35">{learns}</dd>
        </dl>
        {output ? (
          <div className="mt-3 border-t border-foreground/[0.07] pt-2.5">
            <div className="mb-1.5 font-mono text-[9px] text-foreground/22">It made</div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {output.map((line, index) => (
                <li key={index} className="text-xs leading-snug text-foreground/37">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : result ? (
          <div className="mt-3 border-t border-foreground/[0.07] pt-2.5 text-xs font-medium leading-snug text-foreground/43">
            → {result}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PromptCard({
  title,
  prompt,
  result,
  output,
}: {
  title: string
  prompt: string
  result?: string
  output?: string[]
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.09] bg-foreground/[0.022] px-3.5 py-3.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-foreground/45">{title}</span>
        <span className="font-mono text-[9px] text-foreground/21">prompt</span>
      </div>
      <blockquote className="m-0 border-l-2 border-foreground/[0.09] pl-3 font-mono text-[10px] leading-[1.65] text-foreground/31">
        {prompt}
      </blockquote>
      {output ? (
        <div className="mt-3 border-t border-foreground/[0.07] pt-2.5">
          <div className="mb-1.5 font-mono text-[9px] text-foreground/22">output</div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {output.map((line, index) => (
              <li
                key={index}
                className={`text-xs leading-snug ${
                  index === 0 ? 'font-medium text-foreground/43' : 'text-foreground/34'
                }`}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : result ? (
        <p className="mb-0 mt-2.5 text-xs leading-snug text-foreground/37">→ {result}</p>
      ) : null}
    </div>
  )
}

function FieldNoteCard({
  eyebrow,
  title,
  text,
  result,
}: {
  eyebrow: string
  title: string
  text: string
  result: string
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.09] bg-background/35 px-3.5 py-3">
      <div className="mb-2 font-mono text-[9px] text-foreground/23">{eyebrow}</div>
      <div className="text-[13px] font-semibold leading-snug text-foreground/46">{title}</div>
      <p className="my-2 text-xs leading-[1.5] text-foreground/32">{text}</p>
      <div className="text-xs font-medium leading-snug text-foreground/40">{result}</div>
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
    case 'terminal':
      return <TerminalCard title={card.title} text={card.text} />
    case 'file':
      return <FileCard filename={card.filename} text={card.text} />
    case 'cli':
      return (
        <CliCard
          terminal={card.terminal}
          tool={card.tool}
          command={card.command}
          diff={card.diff}
        />
      )
    case 'plan':
      return (
        <PlanCard question={card.question} options={card.options} selected={card.selected} />
      )
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
          id={card.id}
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
    case 'skill':
      return (
        <SkillCard
          title={card.title}
          giveIt={card.giveIt}
          learns={card.learns}
          result={card.result}
          output={card.output}
        />
      )
    case 'prompt':
      return (
        <PromptCard
          title={card.title}
          prompt={card.prompt}
          result={card.result}
          output={card.output}
        />
      )
    case 'field-note':
      return (
        <FieldNoteCard
          eyebrow={card.eyebrow}
          title={card.title}
          text={card.text}
          result={card.result}
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
  skill: 'skill',
  prompt: 'prompt',
  'field-note': 'note',
  terminal: 'terminal',
  cli: 'terminal',
  file: 'file',
  plan: 'conversation',
}

function cardShapeClass(card: CardDef): string {
  const alignRight = Math.abs(hashStr(card.id)) % 2 === 0

  switch (card.type) {
    case 'prompt':
      return `w-[93%] ${alignRight ? 'ml-auto' : 'mr-auto'}`
    case 'field-note':
      return `w-[89%] ${alignRight ? 'ml-auto' : 'mr-auto'}`
    case 'message':
      return `w-[94%] ${alignRight ? 'ml-auto' : 'mr-auto'}`
    case 'chat':
      return `w-[96%] ${alignRight ? 'ml-auto' : 'mr-auto'}`
    default:
      return 'w-full'
  }
}

const COL_WIDTH = 280
const COL_GAP = 12

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

const BACKGROUND_COLUMNS = 5

export function BackgroundCards({ seed, version }: { seed: number; version?: CardVersion }) {
  const selectedCards = getCardsForSeed(seed, version)
  const cards = interleaveForColumns(selectedCards, BACKGROUND_COLUMNS, seed)

  return (
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
          className={`overflow-hidden ${cardShapeClass(card)}`}
          style={{
            breakInside: 'avoid',
            marginBottom: COL_GAP,
          }}
        >
          {renderCard(card)}
        </div>
      ))}
    </div>
  )
}
