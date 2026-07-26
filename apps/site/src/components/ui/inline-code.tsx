import * as React from 'react'
import { cn } from '@/lib/utils'

type InlineCodeProps = React.HTMLAttributes<HTMLElement>

export function InlineCode({ className, ...props }: InlineCodeProps) {
  return (
    <code
      {...props}
      className={cn(
        'rounded-none border border-current/20 bg-current/8 px-1.5 py-0.5 text-sm',
        className,
      )}
    />
  )
}
