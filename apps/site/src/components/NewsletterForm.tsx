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
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [message, setMessage] = React.useState('')

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || status === 'loading') return

    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        setStatus('error')
        setMessage(result.error ?? 'Could not subscribe right now. Try again.')
        return
      }

      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Could not subscribe right now. Try again.')
    }
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
      {status === 'error' ? (
        <Text variant="small" className="sm:basis-full" role="alert">
          {message}
        </Text>
      ) : null}
    </form>
  )
}
