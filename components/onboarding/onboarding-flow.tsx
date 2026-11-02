"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryParam } from "@/hooks/use-query-param";
import type { Mood, RelationshipStage } from "@/lib/prefs/filters";
import { updateSettings } from "@/lib/db/settings";
import { track } from "@/lib/analytics/track";
import { getSettings } from "@/lib/db/dexie";
import { ChevronLeft } from "@/components/brand/icons";
import { Pill } from "@/components/brand/primitives";
import { Button } from "@/components/ui/button";
import { IntroOne, IntroTwo } from "./intro-slides";
import { LoginStep, SignedInStep } from "./login-step";
import { QuizOption, StepDots } from "./quiz-option";

const STAGES: { id: RelationshipStage; label: string; hint: string }[] = [
  { id: "new", label: "Just started dating", hint: "under 1 year" },
  { id: "dating", label: "A while now", hint: "1–3 years" },
  { id: "long_term", label: "Long-term", hint: "3+ years" },
  { id: "married", label: "Married", hint: "any length" },
];

const MOODS: { id: Mood; label: string; hint: string }[] = [
  { id: "fun", label: "Fun and laughs", hint: "light" },
  { id: "deep", label: "Deep talk", hint: "real stuff" },
  { id: "spicy", label: "Something flirty", hint: "18+" },
];

type Step = "intro1" | "intro2" | "login" | "signed-in" | "stage" | "mood" | "content";
const QUIZ: Step[] = ["stage", "mood", "content"];

/**
 * Onboarding (ON-3): two intro slides, a login screen (sign in or continue as
 * guest), then a 3-step quiz (stage + names, mood, content filter + 18+).
 * Existing accounts with saved answers skip the quiz. `?step=quiz` starts at
 * the quiz ("Redo the quiz" in Settings); `?step=signed-in` is where Google and
 * email-link sign-ins come back to.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const param = useQueryParam("step");
  const initial: Step = param === "quiz" ? "stage" : param === "signed-in" ? "signed-in" : "intro1";
  const [step, setStep] = useState<Step>(initial);
  // On a full page load the param is only known after hydration.
  useEffect(() => {
    if (initial !== "intro1") setStep((s) => (s === "intro1" ? initial : s));
  }, [initial]);
  const [stage, setStage] = useState<RelationshipStage | null>(null);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [partnerA, setPartnerA] = useState("");
  const [partnerB, setPartnerB] = useState("");
  const [spicy, setSpicy] = useState(false);
  const [adult, setAdult] = useState(false);
  const prefilled = useRef(false);

  // Start from any saved answers (e.g. "Redo the quiz").
  useEffect(() => {
    if (prefilled.current || step !== "stage") return;
    prefilled.current = true;
    void getSettings().then((s) => {
      if (s.stage) setStage(s.stage);
      if (s.moods.length) setMoods(s.moods);
      if (s.partnerA) setPartnerA(s.partnerA);
      if (s.partnerB) setPartnerB(s.partnerB);
      if (s.is18Confirmed && !s.hideSpicy) {
        setSpicy(true);
        setAdult(true);
      }
    });
  }, [step]);

  async function finish(save: boolean, account: "guest" | "new" | "existing" = "guest") {
    track("onboarding_completed", {
      skipped: step !== "content" && account !== "existing",
      step,
      account,
      stage: save ? stage : null,
      moods: save ? moods : [],
      spicy: save && spicy && adult,
      names_entered: save && Boolean(partnerA.trim() || partnerB.trim()),
    });
    await updateSettings({
      onboardingDone: true,
      ...(save
        ? {
            stage,
            moods,
            partnerA: partnerA.trim(),
            partnerB: partnerB.trim(),
            hideSpicy: !(spicy && adult),
            ...(spicy && adult ? { is18Confirmed: true } : {}),
          }
        : {}),
    });
    router.replace("/");
  }

  const signedIn = useRef(false);
  /** Skip keeps whatever the user already answered. */
  const skip = () => void finish(true, signedIn.current ? "new" : "guest");

  // Stable callbacks for the signed-in check (it runs once).
  const toHome = useCallback(() => {
    track("onboarding_completed", { skipped: false, step: "signed-in", account: "existing" });
    void updateSettings({ onboardingDone: true }).then(() => router.replace("/"));
  }, [router]);
  const toQuiz = useCallback(() => {
    signedIn.current = true;
    setStep("stage");
  }, []);
  const toLogin = useCallback(() => setStep("login"), []);

  // Intro "Skip" goes to the login screen, which has its own guest button.
  if (step === "intro1") return <IntroOne onNext={() => setStep("intro2")} onSkip={toLogin} />;
  if (step === "intro2") return <IntroTwo onNext={toLogin} onSkip={toLogin} />;
  if (step === "login")
    return <LoginStep onBack={() => setStep("intro2")} onGuest={() => setStep("stage")} onSignedIn={() => setStep("signed-in")} />;
  if (step === "signed-in") return <SignedInStep onExisting={toHome} onNew={toQuiz} onNotSignedIn={toLogin} />;

  const index = QUIZ.indexOf(step);
  const back = () => {
    if (index > 0) return setStep(QUIZ[index - 1] as Step);
    // "Redo the quiz" came from Us; otherwise go back to the login screen.
    if (param === "quiz") router.replace("/us");
    else setStep("login");
  };
  const next = () =>
    index === QUIZ.length - 1 ? void finish(true, signedIn.current ? "new" : "guest") : setStep(QUIZ[index + 1] as Step);
  const canContinue = step !== "content" || !spicy || adult;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col gap-6 px-gutter pt-7 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="icon" aria-label="Back" className="size-11" onClick={back}>
          <ChevronLeft />
        </Button>
        <StepDots current={index} total={3} label={`Step ${index + 1} of 3`} />
        <Button variant="ghost" size="sm" className="min-h-11 px-2 text-[15px]" onClick={skip}>
          Skip
        </Button>
      </div>

      {step === "stage" && (
        <>
          <Heading pill="About you two" rotate={-6} title="How long have you been together?" sub="We'll pick decks that fit where you are." />
          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">Relationship stage</legend>
            {STAGES.map((s) => (
              <QuizOption
                key={s.id}
                type="radio"
                name="stage"
                value={s.id}
                checked={stage === s.id}
                onChange={() => setStage(s.id)}
                label={s.label}
                hint={s.hint}
              />
            ))}
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-2.5">
            <legend className="mb-2 text-sm text-muted">Your names (optional, shown on your turn)</legend>
            <NameInput label="You" value={partnerA} onChange={setPartnerA} />
            <NameInput label="Your partner" value={partnerB} onChange={setPartnerB} />
          </fieldset>
        </>
      )}

      {step === "mood" && (
        <>
          <Heading pill="Tonight's vibe" rotate={5} title="What are you in the mood for?" sub="Pick as many as you like." />
          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">Mood</legend>
            {MOODS.map((m) => (
              <QuizOption
                key={m.id}
                type="checkbox"
                name="mood"
                value={m.id}
                checked={moods.includes(m.id)}
                onChange={(on) => setMoods((cur) => (on ? [...cur, m.id] : cur.filter((x) => x !== m.id)))}
                label={m.label}
                hint={m.hint}
              />
            ))}
          </fieldset>
        </>
      )}

      {step === "content" && (
        <>
          <Heading pill="Content" rotate={-4} title="Keep it clean, or add some spice?" sub="You can change this any time in Us." />
          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">Content filter</legend>
            <QuizOption
              type="radio"
              name="content"
              value="clean"
              checked={!spicy}
              onChange={() => setSpicy(false)}
              label="Keep it clean"
              hint="faith-friendly"
            />
            <QuizOption
              type="radio"
              name="content"
              value="spicy"
              checked={spicy}
              onChange={() => setSpicy(true)}
              label="Include spicy decks"
              hint="18+"
            />
          </fieldset>
          {spicy && (
            <label className="flex cursor-pointer items-start gap-3 rounded-panel border border-border bg-surface p-4">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                className="mt-0.5 size-6 shrink-0 accent-pink"
              />
              <span className="text-[15px] leading-snug">
                We&apos;re both 18 or older.{" "}
                <span className="text-muted">Spicy decks are flirty and suggestive, never explicit.</span>
              </span>
            </label>
          )}
        </>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {!canContinue && (
          <p id="adult-hint" className="text-center text-sm text-muted">
            Confirm you&apos;re both 18+ to include spicy decks.
          </p>
        )}
        <Button size="lg" onClick={next} disabled={!canContinue} aria-describedby={canContinue ? undefined : "adult-hint"}>
          {step === "content" ? "Start playing" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function Heading({ pill, rotate, title, sub }: { pill: string; rotate: number; title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <Pill tone="orange" rotate={rotate} className="self-start">
        {pill}
      </Pill>
      <h1 className="font-display text-[38px] leading-[1.04] font-normal tracking-[-0.5px]">{title}</h1>
      <p className="text-base leading-[1.4] text-muted">{sub}</p>
    </div>
  );
}

function NameInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-muted">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="next"
        className="h-[50px] rounded-[25px] border border-border bg-surface px-[18px] text-base text-white placeholder:text-dot focus:border-pink"
      />
    </label>
  );
}
