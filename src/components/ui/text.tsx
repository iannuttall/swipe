import { cn } from '@/lib/utils'

type TextElement = 'p' | 'span' | 'div'
type TextVariant = 'body' | 'small' | 'detail'
type TextColor = 'default' | 'muted'

type TextProps<T extends TextElement = 'p'> = {
  as?: T
  variant?: TextVariant
  color?: TextColor
  className?: string
  children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<T>, 'color' | 'className' | 'children'>

const variantClasses: Record<TextVariant, string> = {
  body: 'font-body text-[length:var(--font-body-size)] leading-relaxed',
  small: 'text-sm',
  detail: 'text-[13px]',
}

const colorClasses: Record<TextColor, string> = {
  default: '',
  muted: 'text-muted',
}

export function Text<T extends TextElement = 'p'>({
  as,
  variant = 'body',
  color = 'default',
  className,
  ...props
}: TextProps<T>) {
  const Component = (as ?? 'p') as React.ElementType
  return (
    <Component
      className={cn(variantClasses[variant], colorClasses[color], className)}
      {...props}
    />
  )
}
