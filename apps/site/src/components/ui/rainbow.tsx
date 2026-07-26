import { cn } from '@/lib/utils'

type RainbowVariant = 'auto' | 'light' | 'dark'

type RainbowProps = {
  variant?: RainbowVariant
  animated?: boolean
  invert?: boolean
  as?: React.ElementType
  className?: string
  children: React.ReactNode
}

const stopsMap = {
  auto: { normal: '--rainbow-auto', invert: '--rainbow-auto-invert' },
  light: { normal: '--rainbow-light', invert: '--rainbow-dark' },
  dark: { normal: '--rainbow-dark', invert: '--rainbow-light' },
} as const

export function Rainbow({
  variant = 'auto',
  animated = false,
  invert = false,
  as: Component = 'span',
  className,
  children,
}: RainbowProps) {
  const stopsVar = stopsMap[variant][invert ? 'invert' : 'normal']
  const stops = `var(${stopsVar})`
  const gradient = animated
    ? `linear-gradient(to right, ${stops}, ${stops})`
    : `linear-gradient(to right, ${stops})`

  return (
    <Component
      className={cn(className)}
      style={{
        backgroundImage: gradient,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        ...(animated && {
          backgroundSize: '200% 100%',
          animation: 'rainbow-shift 3s linear infinite',
        }),
      }}
    >
      {children}
    </Component>
  )
}
