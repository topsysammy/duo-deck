/** Display names for the two players. Falls back to "Player 1/2" until names are entered (Phase 4 quiz). */
export interface Partner {
  name: string;
  turnLabel: string;
}

export function partners(a?: string, b?: string): [Partner, Partner] {
  const make = (raw: string | undefined, fallback: string): Partner => {
    const name = raw?.trim() || fallback;
    return { name, turnLabel: `${name}’s turn` };
  };
  return [make(a, "Player 1"), make(b, "Player 2")];
}
