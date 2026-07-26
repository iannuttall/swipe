import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'primary' | 'ghost'
type ButtonSize = 'default' | 'sm'

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-foreground text-background',
  primary: 'bg-primary text-primary-fg hover:bg-primary/90',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/5',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-1.5',
  sm: 'px-3 py-1',
}

export function Button({
  variant = 'default',
  size = 'default',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-none text-xs uppercase tracking-widest whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
