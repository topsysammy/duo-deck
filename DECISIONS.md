# Decisions

Choices made where the PRD, the build brief or the design canvas were unclear or disagreed.
Newest at the bottom. "PRD" = couples-card-app-prd.md (v2).

1. **Design source.** The "Duo Deck — Key Screens" canvas overrides the brief's default design direction: Bagel Fat One for headings/logo, Outfit for UI *and* card prompts (Bagel is too heavy for 140-character prompts read aloud).
2. **Dark only.** The design is dark; the brief asked for light + dark. Owner chose dark only (2 Nov 2026). Tokens still live in CSS variables, so a light theme can be added later by overriding `:root`.
3. **Onboarding keeps both intro slides** before the 3-step quiz (owner, 2 Nov 2026). To keep ON-1 ("first card within 2 taps"), every onboarding screen has Skip → Home, and Home's "Play now" goes straight into Play (not Deck detail). Shared links skip onboarding.
4. **Contrast fixes to the design** (owner approved): purple gradient end stop darkened `#9A6CEA → #7A55DE` (white text 3.7:1 → 5.0:1); the logo on the sky-blue Onboarding 2 hero will be white instead of pink (1.2:1).
5. **Session end gets a "Share a card" action** — required by GP-9 but missing from the design.
6. **Not `output: 'export'`.** All game pages are prerendered (SSG), but the app deploys as a normal Vercel Next.js app because OG image routes, the auth callback and account deletion need a server.
7. **"New decks without a code deploy"** (PRD §6) is met as "content-only commit → automatic Vercel redeploy", since PRD §9 puts deck JSON in the repo.
8. **Spicy text never in server HTML or previews.** Spicy deck pages show face-down sample cards; spicy card routes will load text client-side after the 18+ gate; spicy OG images are generic.
9. **Single-level decks.** The PRD lists levels only for Deep Talk and After Dark. Other decks have one level ("All cards"); the level list and progress bar's level jump are hidden for them.
10. **Would You Rather card text.** `text` holds the full question read aloud ("A or B?"); `option_a`/`option_b` hold the short labels shown on the pick buttons and reveal.
11. **Date Night In** mixes `question` and `activity` cards in Q&A mode (PRD: "Q&A + activities").
12. **Deck accents.** Each category has an accent token; a deck may override it (`accent` field) so two decks in one category stay distinguishable (Long Distance = sky, Money Matters = yellow). Spicy = new `berry` token (not in the design).
13. **Play-time estimate** ("about 30 minutes", design) = 25 s per card, rounded to 5 minutes. Not in the PRD.
14. **Quiz → "For you"**: stage sets per-deck weights, moods ("fun", "deep", "spicy") boost categories; spicy is never recommended unless 18+ is confirmed *and* the filter is off. Rules in `lib/prefs/filters.ts`.
15. **Content filter semantics** (CB-4, ON-6): `hideSpicy` defaults to on; spicy decks show only when `is18Confirmed && !hideSpicy`. The "Faith-friendly" filter and the content filter are the same switch.
16. **Home is prerendered with default prefs** (spicy hidden, default For you). Phase 4 re-ranks on the client from IndexedDB, so the first paint is fast and never shows spicy decks.
17. **Tab bar labels** follow the design: Decks / Saved (Favorites) / Us (Settings).
18. **Tooling.** npm (pnpm not installed), Next 16, React 19, Tailwind 4 (CSS-first tokens), TypeScript 5.9 strict + `noUncheckedIndexedAccess`. ESLint not set up yet (Next 16 dropped `next lint`); `tsc` + Vitest run instead.
19. **Placeholder content.** 15 cards per deck (150 total), all original and tagged `"draft"`. Deep Talk and After Dark use 5 cards per level.

## Phase 2 — Play

20. **Skipped cards return at the end of the whole deck** (after the last level), per GP-6 wording, not the end of their level. Skipping the only card left is a no-op.
21. **Back/forward is review, not repeat.** Swipe right walks back through history; swipe left walks forward through it again before drawing a new card. Skipped cards are removed from history.
22. **"Seen cards tracked per deck"** = cards from earlier sessions are shuffled to the back of each level, so a new game starts fresh until everything is seen. "Reset deck" (in the level sheet) forgets them and reshuffles.
23. **Games resume.** The game in progress is saved to IndexedDB on every move, so a reload, an app update or a phone call doesn't lose the place. Opening a deck with `?level=` jumps the resumed game to that level.
24. **Turn names fall back to "Player 1 / Player 2"** until names are entered (quiz/settings, Phase 4). Turns alternate per card and follow review (going back shows whose turn that card was).
25. **Would You Rather is pass-the-phone:** whose-turn player picks in secret → "Pass the phone to …" → partner picks → side-by-side reveal. Picks are saved per card, so going back shows the reveal again.
26. **Keyboard:** → next, ← previous (matches swipe left = next card coming in). Ignored while typing or when a dialog is open.
27. **Swipe thresholds:** 90 px, or a flick faster than 500 px/s that travelled at least 40 px. A right swipe on the first card snaps back.
28. **Reduced motion:** the card doesn't follow the finger and changes with a short cross-fade; the swipe gesture is still recognised.
29. **Cards load client-side** from `/decks/<slug>.v<version>.json` (published by `scripts/copy-decks.mjs` before dev/build), so the Play page HTML carries no card text and the service worker (Phase 4) can cache each pack for offline play.
30. **Finishing a deck** (Next on the last card) and **End** both save the session and open the session end screen (`/session?id=…`, full design in Phase 3).
31. **Behind-card colour** on Play is the deck accent; cream-accent decks use magenta (as in the design) so the two cards stay distinct.

## Phase 3 — Favorites, session end, sharing

32. **OG images use `next/og`**, which is the `@vercel/og` engine bundled inside Next.js, so no extra dependency. All 161 images (home, 10 decks, 150 cards) are generated at build time.
33. **OG fonts are vendored** in `assets/fonts` as static WOFF files (the OG renderer can't read WOFF2 or variable fonts). Licence: `assets/fonts/OFL.txt`.
34. **No ₦ in card text.** Outfit has no Naira glyph, so OG images can't render it (the site would fall back to a system font). The one draft card now says "a million naira", and a content test rejects characters outside Latin-1 plus curly quotes and dashes. Writers should spell out currencies, or we add a fallback font later.
35. **Spicy sharing is link-only.** No image option, and the share text is generic ("A card from After Dark on Duo Deck (18+)"). Spicy card pages show a locked "18+ card" and never include the text in HTML, meta tags or the client payload. Their OG image is the generic deck image. "Play this deck" on a spicy card page goes to the deck page, where the 18+ gate will sit (Phase 4).
36. **Favorites mini-deck** (`/play/favorites`) is a snapshot taken when it starts: one level, shuffled, not resumed after a reload, and it doesn't count towards each deck's seen cards.
37. **Session end share suggestion:** the first clean card you saved, else the last clean card you played, else the deck link.
38. **Session end URL is `/session?id=…`** (rendered on the device), because session ids are created on the device and never reach the server.
39. **Share images** (1080×1920 PNG) are made on the device with html-to-image, so they work offline. The library loads only when someone taps an image option. Where the browser can share files, the image goes to the share sheet; otherwise it downloads.
40. **Card ids must look like `<deck-id>-<nnn>`.** Session end uses this to find a card's deck, and the content test enforces it.

## Phase 4 — PWA, onboarding, settings, 18+ gate

41. **Production builds use webpack** (`next build --webpack`) because Serwist plugs into webpack. `next dev` keeps Turbopack, with the service worker off.
42. **What the service worker precaches:** app-shell pages (`/`, `/welcome`, `/saved`, `/us`, `/session`, `/play/favorites`, `/~offline`) plus JS/CSS. That's about 480 KB gzipped, downloaded once in the background after the first visit. Excluded: font files (next/font emits every subset, about 600 KB; the few that are used get cached on first use with no expiry) and deck packs (cached when opened).
43. **Offline (PW-2):** opening a deck also stores its `/deck` and `/play` pages, so it plays from a cold start with no network. Pages use network-first with a 3 s timeout (for slow 4G), then the cache, then `/~offline`. A deck that has never been opened shows the offline page.
44. **Update banner (PW-4):** a new version waits until the user taps "Refresh". The banner is hidden on `/play/*`, so nothing reloads mid-game.
45. **First visit:** an inline script on `/` checks a localStorage flag and sends first-time visitors to `/welcome` before anything paints. Shared deck and card links never redirect. If storage is blocked, Home shows normally.
46. **Quiz:** partner names sit on step 1, as in the design. Mood is multi-select (fun / deep / flirty). The content step needs an explicit "We're both 18 or older" tick before spicy can be included. Skip keeps any answers already given. "Redo the quiz" in Settings opens `/welcome?step=quiz` with the saved answers filled in.
47. **18+ gate:** confirming also turns the content filter off (otherwise nothing would change). With the filter on, spicy content is hidden everywhere: Home, Saved, the favorites mini-deck and spicy links (which show "Spicy decks are hidden"). On the shared card page, spicy text is fetched only after the gate.
48. **Delete my data (ON-5, local part):** clears IndexedDB and localStorage immediately. The service-worker caches stay, because they hold only public content. Account deletion follows in Phase 5.
49. **Install prompt (PW-5):** a card on the session end screen until it's used or dismissed (`installPromptSeen`). On Android it triggers the native prompt (captured early by an inline script). On iOS it opens a Share → Add to Home Screen instructions sheet. Settings shows an Install row while installing is possible.
50. **"Download all decks"** (PW-3, a P1 that the brief puts in Settings) stores every pack and its pages, well under 1 MB.
51. **Privacy page** (`/privacy`) is a plain-language draft with [placeholders]. It needs legal review before launch.
52. **npm audit** reports 6 advisories, all in Serwist's build-time tooling (glob, minimatch, zod). Nothing ships to browsers. Revisit when Serwist updates.
53. **Home first-load JS rose to 224 KB** (from 183 KB) because Home now reads IndexedDB for names and recommendations. Still under the 300 KB budget.
54. **Explicit icons:** declaring `metadata.icons` disables the automatic `app/icon.svg` link, so both the SVG favicon and the Apple touch icon are listed in the layout.

## Changes after review

55. **No turn sticker on cards** (owner, 2 Nov 2026). The orange "Player 1's turn" / "Ada's turn" sticker is gone from the Play card, and the "Your turn" sticker is gone from shared card pages. Screen readers no longer announce turns either. Turns still drive Would You Rather (who picks first, "Pass the phone to …"), and the quiz name fields stay.
56. **20 cards per deck** (owner, 2 Nov 2026): 5 new original draft cards each (200 total). Deep Talk and After Dark split 1 / 2 / 2 across levels (now 6 / 7 / 7). Date Night In got 3 activities + 2 questions. Every deck's `version` went from 1 to 2, so offline caches download the new packs. Games in progress on the old version start fresh.

## Phase 5 — Accounts, sync, analytics

57. **Auth runs in the browser** with supabase-js using PKCE: no server sessions or cookies. The only server code is `/api/account/delete`, which checks the caller's access token. That keeps every page static. The ~45 KB Supabase client loads only when someone opens sign-in, or when a device that signed in before starts up (flag `dd-signed-in`).
58. **Email sign-in sends both a link and a 6-digit code.** On iPhone an installed PWA and Safari don't share storage, so a magic link opened from Mail would sign in Safari, not the app. Typing the code works everywhere. This needs `{{ .Token }}` in the Supabase email template (`supabase/README.md`).
59. **Merge rules (ON-4, `lib/sync/merge.ts`, unit-tested):**
    - Favorites: per card, newest change wins (hearting or un-hearting). Un-hearting syncs as a tombstone so it reaches other phones. A guest heart never synced and later removed is simply dropped.
    - History (sessions): append-only. Pushed up, and pulled down to other phones.
    - Settings ↔ profile: newer side wins field by field, an empty field never wipes a filled one, and an 18+ confirmation on either side is kept.
60. **When sync runs:** right after sign-in; on app start; ~1.5 s after any local change; when the network returns; and when the app comes back to the foreground (to pick up other phones' changes). Local IndexedDB stays the source of truth, so offline use is unaffected.
61. **Sign out keeps this phone's data** so the guest can keep playing. "Delete my data" still wipes it. "Delete account" deletes the auth user, which cascades to all their rows immediately (faster than the PRD's 30 days), then wipes this phone.
62. **Not synced:** per-deck "seen cards" and games in progress stay per device. `rooms` (remote play, P1) isn't in the migration yet.
63. **RLS is tested in real Postgres** (PGlite, WASM) against a stub of Supabase's `auth` schema: owner-only reads and writes, no anonymous access, value checks, and cascading deletes.
64. **Analytics: PostHog `cookieless_mode: "always"`**, as the brief asks. No cookies or local storage (verified), no autocapture, no session replay, no surveys. PostHog loads after the page is idle, so it isn't part of first-load JS. It respects Do Not Track / Global Privacy Control, and Settings has a "Share anonymous usage stats" switch. **Trade-off:** cookieless mode identifies visitors with a hash that PostHog rotates daily, so **D7/D30 retention (PRD §10) can't be measured per visitor**. Options: accept that and track weekly returning visitors and installs; or switch to `cookieless_mode: "on_reject"` with a consent prompt; or send an anonymous id only for signed-in users.
65. **PostHog's bot filter drops headless or automated browsers.** Browser tests hide `navigator.webdriver` and use a phone user agent to see events. Production users are unaffected.
66. **Card events carry deck_id, card_id, level and mode** (`qa`, `would_you_rather` or `favorites`). In the favorites mini-deck, `level` is the mini-deck's single level (1), not the card's level in its original deck.
67. **Account section always visible** (owner feedback, 2 Nov 2026). Without Supabase keys it explains that sign-in isn't switched on yet, instead of disappearing. Once keys are set it shows "Sign in to sync", and after sign-in "Sync now", "Sign out" and "Delete account".

## Phase 6 — Performance, accessibility and offline audit

68. **Pages no longer bail out to client-only rendering.** `useSearchParams` inside a statically prerendered page made Next send an empty body for Play, Welcome, Session and Sign-in, so nothing painted until all the JS had run (Play's first paint was 3.4 s on throttled 4G). A small `useQueryParam` hook (`hooks/use-query-param.ts`) reads the query string after hydration instead. Play's first paint dropped to about 0.9 s in Lighthouse's mobile simulation. Opening `/welcome?step=quiz` with a full page load shows intro 1 for one frame before the quiz.
69. **Deck packs are preloaded** on non-spicy Play pages (`<link rel="preload" as="fetch">`), so the cards download alongside the JS. Spicy packs still load only after the 18+ gate.
70. **Known gap: Lighthouse mobile Performance on Play pages is 88–90; every other page scores 93–100.** The score comes from Largest Contentful Paint, which on Play is the card itself. The card renders in the browser after the JS, IndexedDB (resume) and the deck pack load. That's by design: spicy text stays out of the HTML, and the pack is what the service worker caches for offline play. Under the simulated slow 4G this costs about 3.7 s, against about 0.9 s for pages whose main content is in the HTML. Possible next step: render the first card without waiting for Framer Motion. That needs a decision from the owner.
71. **Accessibility fixes:**
    - Welcome now has a `<main id="main">` landmark, so the skip link works.
    - Deck tiles drop their `aria-label`. The name is now first in the DOM, while still sitting at the bottom visually through `flex-col-reverse`, so the link's accessible name matches its visible text (WCAG 2.5.3).
    - axe-core (WCAG 2.1 A/AA + best practice) found no issues on 14 pages and 6 dialog or game states.
    - Keyboard walk-through: every control can be reached and shows a focus ring.
72. **Measured:**
    - Initial JS, gzipped: 185 KB (Home) to 214 KB (Play).
    - Swipes at a 4× slower CPU: 317 frames with a median and 95th percentile of 16.7 ms, and no frame over 20 ms. Only 11 layouts in 5 swipes, all at card changes.
    - CLS is 0 everywhere except Us (0.03).
    - The SEO score of 60 on Play, Saved, Us, Sign-in and Session is because these pages are deliberately `noindex`.
73. **Content tests no longer require the `draft` tag** (removing it is how a card gets approved). The card-count test uses a synthetic deck, so editing real decks never breaks it.
74. **`NEXT_PUBLIC_SITE_URL` falls back to Vercel's production domain** (`VERCEL_PROJECT_PRODUCTION_URL`) when it isn't set. Without this, share previews pointed at `localhost`.
75. **The Supabase URL is normalised** (a pasted `…/rest/v1/` or trailing slash is stripped), in the client and in the delete-account route.
