import { cn } from '@/lib/utils'
import * as React from 'react'

type InputProps = {
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full min-w-0 rounded-none border-0 bg-foreground/5 px-3 py-2 text-sm font-medium outline-none transition-shadow placeholder:text-muted',
          'shadow-[inset_0_-2px_0_var(--color-border)] focus-visible:shadow-[inset_0_-2px_0_var(--primary)]',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
