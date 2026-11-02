/**
 * Would You Rather round (GP-3), pass-the-phone style:
 * first player picks in secret → pass the phone → second player picks → reveal.
 * Pure state machine; one round per card.
 */
export type Choice = "a" | "b";

export type WyrPhase = "first" | "pass" | "second" | "reveal";

export interface WyrRound {
  phase: WyrPhase;
  first: Choice | null;
  second: Choice | null;
}

export const NEW_ROUND: WyrRound = { phase: "first", first: null, second: null };

export function pick(round: WyrRound, choice: Choice): WyrRound {
  if (round.phase === "first") return { ...round, phase: "pass", first: choice };
  if (round.phase === "second") return { ...round, phase: "reveal", second: choice };
  return round;
}

/** Second player confirms they have the phone. */
export function handOver(round: WyrRound): WyrRound {
  return round.phase === "pass" ? { ...round, phase: "second" } : round;
}

export function isMatch(round: WyrRound): boolean {
  return round.phase === "reveal" && round.first === round.second;
}
