import { AccentCard, Logo, Pill } from "@/components/brand/primitives";
import { CrownDoodle, HeartDoodle } from "@/components/brand/doodles";
import { Button } from "@/components/ui/button";

function Dots({ active }: { active: 0 | 1 }) {
  return (
    <div className="my-5 flex justify-center gap-1.5" role="img" aria-label={`Page ${active + 1} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`size-2.5 rounded-full ${i === active ? "bg-white" : "bg-dot"}`} />
      ))}
    </div>
  );
}

/** Onboarding 1 (design artboard "1 · Onboarding"). */
export function IntroOne({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col px-gutter pt-7 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="min-h-11 px-2 text-[15px]" onClick={onSkip}>
          Skip
        </Button>
      </div>
      <Logo as="div" className="text-center text-[34px] tracking-[-0.5px]" />

      <div className="relative mx-auto mt-[18px] h-[372px] w-full max-w-[342px]" aria-hidden="true">
        {/* Cards back to front, then stickers and doodles on top. */}
        <CrownDoodle width={56} className="top-0 left-[62%] rotate-[14deg]" />
        <AccentCard accent="cream" rotate={-6} className="absolute top-[34px] left-[2%] flex h-[146px] w-[60%] items-end p-[18px]">
          <p className="text-lg leading-[1.2] font-semibold">What&apos;s your favourite memory of us?</p>
        </AccentCard>
        <AccentCard accent="yellow" rotate={-3} className="absolute top-[222px] left-[6%] flex h-[118px] w-[51%] items-end p-4">
          <p className="max-w-[70%] text-[17px] leading-[1.2] font-semibold">Rate our last date out of 10.</p>
        </AccentCard>
        <AccentCard accent="purple" rotate={5} className="absolute top-[150px] left-[41%] flex h-[150px] w-[58%] flex-col justify-between p-[18px]">
          <div className="absolute -top-[18px] -right-[18px] size-[78px] rotate-[24deg] rounded-[18px] border border-white/45 bg-white/15" />
          <p className="text-xs font-semibold tracking-[0.5px]">WOULD YOU RATHER</p>
          <p className="relative text-lg leading-[1.2] font-semibold">Beach weekend or a cosy night in?</p>
        </AccentCard>
        <HeartDoodle width={40} className="top-[318px] left-[62%] -rotate-12" />
        <Pill tone="orange" rotate={-20} className="absolute top-7 left-[39%]">
          Deep talk
        </Pill>
        <Pill tone="blue" rotate={22} className="absolute top-[290px] left-[74%]">
          Date night
        </Pill>
        <Pill tone="magenta" rotate={-14} className="absolute top-[322px] left-[33%]">
          Fun
        </Pill>
      </div>

      <div className="mt-auto flex flex-col gap-2.5">
        <h1 className="font-display text-[40px] leading-[1.02] font-normal tracking-[-0.5px]">
          Real talk,
          <br />
          closer hearts
        </h1>
        <p className="text-[17px] leading-[1.4] text-muted">
          Card games that get you two talking about the things that matter. Free, no sign-up.
        </p>
      </div>
      <Dots active={0} />
      <Button size="lg" onClick={onNext}>
        Next
      </Button>
    </div>
  );
}

/** Onboarding 2 (design artboard "2 · Onboarding 2"). Logo is white here for contrast (DECISIONS #4). */
export function IntroTwo({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="relative h-[min(540px,62dvh)] shrink-0 overflow-hidden bg-sky">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-[calc(20px+env(safe-area-inset-top))] right-4 z-10 min-h-11 px-3 text-[15px] font-semibold text-ink hover:text-ink"
          onClick={onSkip}
        >
          Skip
        </Button>
        <div aria-hidden="true" className="absolute inset-0 mx-auto max-w-[390px]">
          <CrownDoodle width={84} className="top-[calc(4px+env(safe-area-inset-top))] left-[40%] rotate-[10deg]" />
          <p className="absolute inset-x-0 top-[78px] text-center font-display text-[34px] leading-none text-white">
            duo deck.
          </p>
          <AccentCard accent="magenta" rotate={-12} className="absolute top-[168px] left-[8%] h-[300px] w-[59%] rounded-[28px]" />
          <AccentCard
            accent="cream"
            rotate={7}
            className="absolute top-[150px] left-[25%] flex h-[310px] w-[62%] flex-col justify-between rounded-[28px] p-6"
          >
            <Pill tone="blue" className="self-start px-3 py-1.5 text-[13px]">
              Long distance
            </Pill>
            <p className="text-[25px] leading-[1.15] font-semibold">
              What&apos;s the first thing we&apos;ll do when we&apos;re together again?
            </p>
          </AccentCard>
          <div className="absolute top-[132px] left-[8%] -rotate-[30deg]">
            <span className="block rounded-full bg-magenta px-[18px] py-[9px] text-[15px] font-medium text-white">Share</span>
            <span className="-mt-[9px] ml-3.5 block size-4 rotate-45 bg-magenta" />
          </div>
        </div>
      </div>
      <div className="relative -mt-[60px] flex grow flex-col items-center rounded-t-[52px] bg-black px-gutter pt-9 pb-[calc(32px+env(safe-area-inset-bottom))] text-center">
        <h1 className="font-display text-[40px] leading-[1.02] font-normal tracking-[-0.5px]">
          Play close
          <br />
          or far apart
        </h1>
        <p className="mt-3 text-[17px] leading-[1.4] text-muted">
          Pass one phone between you, or send a card on WhatsApp. No download needed.
        </p>
        <div className="mt-auto w-full">
          <Dots active={1} />
          <Button size="lg" className="w-full" onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
