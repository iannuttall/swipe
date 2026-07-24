import { DitherCard } from '@/components/DitherCard'
import { NewsletterForm } from '@/components/NewsletterForm'
import { Rainbow } from '@/components/ui/rainbow'

export function HomeHero() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-8">
      <div
        className="pointer-events-auto w-full max-w-[620px] rounded-xl bg-[var(--bg)] p-2.5 sm:p-3.5"
        style={{ boxShadow: '0 0 76px 52px var(--bg)' }}
      >
        <DitherCard className="w-full" stripSize={20}>
          <h1 className="mb-4 font-heading text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[2.65rem]">
            Swipe the best AI skills, prompts, and workflows.
          </h1>
          <p className="mb-6 max-w-[30rem] text-[1.15rem] leading-[1.45] sm:text-[1.3rem]">
            <Rainbow as="em" invert animated className="font-mono font-semibold">
              The
            </Rainbow>{' '}
            newsletter to learn AI by stealing the cool ideas, skills, and tools you didn't
            know you needed.
          </p>
          <NewsletterForm
            source="home_v2_cta"
            buttonText="Subscribe"
            buttonVariant="primary"
            buttonClassName="subscribe-button h-12 px-6 font-heading text-base font-semibold normal-case tracking-normal text-white"
            inputClassName="h-12 text-base"
          />
        </DitherCard>
      </div>
    </div>
  )
}
