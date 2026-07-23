import * as React from 'react'
import { Dithering } from '@paper-design/shaders-react'

type DitheringShape = 'simplex' | 'sine' | 'truchet' | 'fbm' | 'swirl'

const RANDOM_SHAPES: DitheringShape[] = ['simplex', 'sine', 'truchet', 'fbm']

type DitherCardProps = {
  children: React.ReactNode
  className?: string
  shape?: DitheringShape | 'random'
  /** 'strips' = top/bottom dither, 'left' = dither on left side, 'background' = full dither bg */
  variant?: 'strips' | 'left' | 'background'
  /** Height of dither strips (strips variant) or width of dither strip (left variant) */
  stripSize?: number
  /** Override dither colors: [back, front] */
  colors?: [string, string]
  /** Swap dither back/front colors (dither matches card bg/fg) */
  invertDither?: boolean
}

function hashString(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Resolve a CSS variable to an rgb() string the WebGL shader can parse. */
function resolveColorVar(varName: string, fallback: string): string {
  const el = document.createElement('div')
  el.style.color = `var(${varName})`
  document.body.appendChild(el)
  const computed = getComputedStyle(el).color
  el.remove()
  return computed || fallback
}

/** Read resolved CSS variable colors so dither always matches the page. */
function useThemeColors() {
  const [colors, setColors] = React.useState<{
    bg: string
    fg: string
    muted: string
    isDark: boolean
  } | null>(null)

  React.useEffect(() => {
    function read() {
      const bg = resolveColorVar('--bg', '#ffffff')
      const fg = resolveColorVar('--fg', '#0f1115')
      const muted = resolveColorVar('--muted', '#6b7280')
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setColors({ bg, fg, muted, isDark })
    }

    read()

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => read()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return colors
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

export function DitherCard({
  children,
  className,
  shape = 'random',
  variant = 'strips',
  stripSize = 16,
  colors,
  invertDither = false,
}: DitherCardProps) {
  const theme = useThemeColors()
  const reducedMotion = useReducedMotion()
  const instanceId = React.useId()
  const motionSeed = React.useMemo(() => hashString(instanceId), [instanceId])
  const speedVariance = (motionSeed % 17) / 100
  const motionSpeed = 0.22 + speedVariance
  const offsetX = ((motionSeed % 200) - 100) / 100
  const offsetY = (((motionSeed >> 3) % 200) - 100) / 100
  const rotation = motionSeed % 360
  const scale = 0.92 + ((motionSeed % 13) / 100)

  const resolvedShape = React.useMemo(() => {
    if (shape !== 'random') return shape
    return RANDOM_SHAPES[motionSeed % RANDOM_SHAPES.length]
  }, [shape, motionSeed])

  const defaultBack = theme?.bg || '#ffffff'
  const defaultFront = theme?.fg || '#0f1115'

  // Fade in after client hydration so the dither doesn't pop in jarringly
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const ditherProps = {
    colorBack: colors?.[0] ?? (invertDither ? defaultFront : defaultBack),
    colorFront: colors?.[1] ?? (invertDither ? defaultBack : defaultFront),
    shape: resolvedShape as 'simplex',
    type: '4x4' as const,
    size: 3,
    speed: reducedMotion ? 0 : motionSpeed,
    offsetX,
    offsetY,
    rotation,
    scale,
  }

  const ditherTransition: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.6s ease-in',
  }

  if (variant === 'background') {
    const bgDitherProps = {
      ...ditherProps,
      colorBack: colors?.[0] ?? (theme?.fg || '#0f1115'),
      colorFront: colors?.[1] ?? (theme?.muted || '#6b7280'),
    }
    return (
      <div
        className={`relative overflow-hidden ${className ?? ''}`}
        style={{ color: theme?.isDark ? '#191c1e' : '#ffffff' }}
      >
        <Dithering {...bgDitherProps} className="absolute inset-0" style={ditherTransition} />
        <div className={`absolute inset-0 ${theme?.isDark ? 'bg-white/20' : 'bg-gradient-to-b from-transparent to-black/35'}`} />
        <div className="relative z-10 px-7 py-7 sm:px-8 sm:py-8">{children}</div>
      </div>
    )
  }

  if (variant === 'left') {
    return (
      <div className={`flex ${className ?? ''}`}>
        <Dithering {...ditherProps} style={{ width: stripSize, ...ditherTransition }} className="shrink-0" />
        <div className="flex-1 border-l-[2px] border-dither bg-card px-7 py-7 sm:px-8 sm:py-8">
          {children}
        </div>
      </div>
    )
  }

  // strips (default) — inverted bg/fg
  return (
    <div className={`flex flex-col ${className ?? ''}`}>
      <Dithering {...ditherProps} style={{ height: stripSize, ...ditherTransition }} className="w-full" />
      <div
        className="flex-1 px-7 py-7 sm:px-8 sm:py-8"
        style={{
          backgroundColor: 'var(--card-inv-bg)',
          color: 'var(--card-inv-fg)',
          '--bg': 'var(--card-inv-bg)',
          '--fg': 'var(--card-inv-fg)',
          '--primary': 'var(--primary-inv)',
          '--primary-fg': 'var(--primary-inv-fg)',
          '--border': 'color-mix(in oklch, var(--card-inv-fg) 25%, transparent)',
          '--muted': 'color-mix(in oklch, var(--card-inv-fg) 60%, transparent)',
        } as React.CSSProperties}
      >
        {children}
      </div>
      <Dithering
        {...ditherProps}
        offsetY={offsetY + 0.8}
        rotation={(rotation + 40) % 360}
        style={{ height: stripSize, ...ditherTransition }}
        className="w-full"
      />
    </div>
  )
}
