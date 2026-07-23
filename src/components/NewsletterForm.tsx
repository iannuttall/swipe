import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'

type NewsletterFormProps = {
  source: string
  buttonText?: string
  buttonVariant?: 'default' | 'primary'
  buttonClassName?: string
  inputClassName?: string
}

export function NewsletterForm({
  source,
  buttonText = 'Subscribe',
  buttonVariant = 'default',
  buttonClassName,
  inputClassName,
}: NewsletterFormProps) {
  const inputId = React.useId()
  const [email, setEmail] = React.useState('')
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success'>('idle')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim() || status === 'loading') return

    setStatus('loading')
    window.setTimeout(() => {
      setStatus('success')
      setEmail('')
    }, 350)
  }

  if (status === 'success') {
    return <Text variant="small">you&apos;re in - check your inbox.</Text>
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-source={source}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <label htmlFor={inputId} className="sr-only">
        Email address
      </label>
      <Input
        id={inputId}
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="sam@openai.com"
        autoComplete="email"
        required
        className={inputClassName}
      />
      <Button
        type="submit"
        disabled={status === 'loading'}
        variant={buttonVariant}
        className={buttonClassName}
      >
        {status === 'loading' ? 'Sending...' : buttonText}
      </Button>
    </form>
  )
}
