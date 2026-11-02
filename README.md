# Duo Deck

A free conversation-card game for couples. You install it as a web app (PWA) on your phone, and every deck you've opened keeps working offline. Accounts are optional: guests can play everything, and signing in keeps favorites and history in sync across phones.

**Stack:** Next.js 16 (App Router, TypeScript strict), Tailwind CSS 4, shadcn/ui primitives, Framer Motion, Serwist (service worker), Dexie (IndexedDB), Supabase (auth and sync), PostHog in cookieless mode (analytics), `next/og` + Web Share API + html-to-image (sharing). It's hosted on Vercel.

Product decisions and the reasons behind them are in [DECISIONS.md](DECISIONS.md).

---

## 1. Run it locally

You need **Node.js 20.9 or newer** (`node -v`).

```bash
npm install
cp .env.example .env.local   # then fill it in (see section 2)
npm run dev                  # http://localhost:3000
```

The app runs without any keys. Sign-in shows "not set up yet" and analytics stays off, but everything else works.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload. The service worker is **off** in dev. |
| `npm run build` | Production build. Uses webpack (`--webpack`) because Serwist builds the service worker through webpack. |
| `npm start` | Serves the production build: the real PWA, with offline support and install. |
| `npm test` | Unit tests (Vitest): card engine, filters, merge rules, sharing, content checks, and RLS policies in a real Postgres (PGlite). |
| `npm run typecheck` | TypeScript in strict mode. |

To test **offline play or installing**, use `npm run build && npm start`, not `npm run dev`.

To try it on **your phone**, run `npx next start -H 0.0.0.0`, then open `http://<your-computer's-Wi-Fi-IP>:3000` with the phone on the same Wi-Fi. (On macOS, `ipconfig getifaddr en0` prints the IP.) Install and offline mode need HTTPS on a phone, so test those on the Vercel deployment.

## 2. Environment variables

Put them in `.env.local` for local runs and in **Vercel → Project → Settings → Environment Variables** for deployments. `.env.local` is in `.gitignore`; never commit it.

| Variable | Needed? | Where it's used | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Recommended | Share links, Open Graph previews | Your public address with no trailing slash, e.g. `https://duo-deck.vercel.app`. If it isn't set on Vercel, the app uses Vercel's production domain. |
| `NEXT_PUBLIC_SUPABASE_URL` | For accounts | Browser | The **Project URL**, `https://<ref>.supabase.co`. Not the `/rest/v1/` API address. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For accounts | Browser | The anon or **publishable** key. It's safe to expose because Row Level Security protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | For "Delete account" | **Server only** (`/api/account/delete`) | The service_role or **secret** key. **Never** prefix it with `NEXT_PUBLIC_` and never paste it anywhere public. |
| `NEXT_PUBLIC_POSTHOG_KEY` | For analytics | Browser | PostHog project API key (`phc_…`). Leave it empty to turn analytics off. |
| `NEXT_PUBLIC_POSTHOG_HOST` | For analytics | Browser | `https://eu.i.posthog.com` (EU Cloud) or `https://us.i.posthog.com`. |

`NEXT_PUBLIC_*` values are **baked in at build time**. After changing one, rebuild locally, or redeploy on Vercel.

### Supabase (accounts and sync)
Follow [supabase/README.md](supabase/README.md). In short:
1. Create a project.
2. Run `supabase/migrations/0001_init.sql` in the SQL Editor.
3. Add the `/auth/callback` redirect URLs.
4. Enable Email (and optionally Google).
5. Put `{{ .Token }}` in the "Magic Link" and "Confirm signup" email templates.
6. Before launch, add your own SMTP sender.

### PostHog (analytics)
1. Create a project on PostHog (EU Cloud is recommended) and copy its key.
2. In **Project settings**, turn on **Cookieless server hash mode**. **Without it, PostHog drops every event.**
3. Optionally turn on "Discard client IP data".

The app sends no cookies and stores nothing on the device for analytics. It honours Do Not Track and Global Privacy Control, and users can switch analytics off under *Us → Share anonymous usage stats*.

## 3. Add or edit a deck

All card content is static JSON in [content/](content/):

```
content/
  categories.json        the shelves on Home (name, accent colour, spicy or not, order)
  manifest.json          version and card count of every deck (must match the decks)
  decks/<deck-id>.json   one file per deck, with all its cards
```

At build time `scripts/copy-decks.mjs` publishes each deck to `public/decks/<slug>.v<version>.json`. The app downloads decks from there, and the service worker caches them for offline play. Card text is never part of the page HTML, so spicy cards stay behind the 18+ gate.

### Edit cards in an existing deck
1. Open `content/decks/<deck-id>.json` and change, add or remove cards (the format is below).
2. **Increase the deck's `"version"`** by one, e.g. `2` → `3`. This makes phones download the new version instead of using their cached copy.
3. In `content/manifest.json`, set that deck's `version` and `card_count` to match.
4. Run `npm test`. The content tests catch mistakes such as duplicate ids, missing fields, prompts over 140 characters, a manifest that doesn't match, or characters the share-image font can't draw.
5. Commit and push. Vercel redeploys, and the next time someone opens the app they get an "Update available" banner.

Games in progress on the old version start fresh when the version changes. Saved favorites keep working as long as the card **ids** stay the same, so don't renumber existing cards; give new cards new ids.

### Card format
```jsonc
{
  "id": "deep-talk-021",        // "<deck-id>-NNN", unique across all decks; never reuse an id
  "deck_id": "deep-talk",       // the deck's id
  "level": 2,                   // must match one of the deck's levels
  "type": "question",           // "question" | "activity" | "would_you_rather"  ("dare" is reserved)
  "text": "What's something you've never told anyone?",   // 140 characters max
  "option_a": null,             // Would You Rather only: first choice (otherwise null)
  "option_b": null,             // Would You Rather only: second choice (otherwise null)
  "tags": ["draft"],            // free-form; "draft" means "not reviewed yet", so remove it once approved
  "spice_level": 0,             // 0 in normal decks; 1–3 in spicy decks
  "locale": "en",
  "version": 1                  // increase when you rewrite this card's text
}
```

Writing rules: one clear prompt, under 140 characters, no names or pronouns that assume a gender, straight quotes or curly quotes (both fine). Would You Rather cards live only in Would You Rather decks (`"mode": "would_you_rather"`), with `text` such as `"Would you rather…"` and both options filled in.

### Add a new deck
1. Copy an existing deck file to `content/decks/<new-id>.json` and set:
   - `id` and `slug`: the same lowercase-with-dashes name, e.g. `"road-trip"`.
   - `name`, `tagline`, `description`.
   - `category_id`: one of the ids in `categories.json`. A deck in a spicy category must have `"is_spicy": true`.
   - `mode`: `"qa"` (questions and activities) or `"would_you_rather"`.
   - `levels`: numbered from 1, e.g. `[{ "id": 1, "name": "Warm up", "blurb": "easy" }]`. Every level needs at least one card.
   - Optionally `accent`, to override the category colour: `cream`, `orange`, `yellow`, `sky`, `magenta`, `blue`, `berry` or `purple`.
   - `version`: `1`.
2. Register it in [lib/content/registry.ts](lib/content/registry.ts): add an `import` line and put it in the `DECKS` list. Its position in the list is its order on Home.
3. Add it to `content/manifest.json` (`"road-trip": { "version": 1, "card_count": 20 }`) and increase the manifest's top-level `version`.
4. Run `npm test`, then `npm run dev` and open `/deck/road-trip`.

To add a **category** (a new shelf), add it to `categories.json`, and add its id to the `CategoryId` type in [lib/content/types.ts](lib/content/types.ts).

## 4. Deploy to Vercel

The repo is on GitHub, and Vercel deploys every push to `main` automatically.

First-time setup:
1. **vercel.com/new → Import** the GitHub repository. Keep the detected framework (Next.js) and the default build settings. `npm run build` already runs the deck script and the webpack build.
2. Add the **environment variables** from section 2 (Production, and Preview if you want sign-in on preview deploys too).
3. Click **Deploy**.
4. After the first deploy:
   - Set `NEXT_PUBLIC_SITE_URL` to your live address and **Redeploy**.
   - In Supabase → Authentication → URL Configuration, set **Site URL** to the live address and add `https://<your-domain>/auth/callback` (and your preview pattern) to **Redirect URLs**.
5. **Custom domain (optional):** Vercel → Settings → Domains. Afterwards update `NEXT_PUBLIC_SITE_URL` and the Supabase URLs, then redeploy.

Then check:
- [ ] The site loads, and "Install" or "Add to Home Screen" works on a phone.
- [ ] Open a deck, turn on airplane mode, close and reopen the app: the deck still plays.
- [ ] A shared card link shows a preview image in WhatsApp.
- [ ] Sign-in by email code works, and favorites appear in Supabase → Table Editor.
- [ ] Events show up in PostHog → Activity (use a normal browser, not an automated one).

### Before launch
- Connect your own **SMTP** sender in Supabase (the built-in one only allows a few emails per hour).
- **Publish the Google OAuth consent screen**, if you use Google sign-in.
- Finish the **privacy policy** at `/privacy` (fill in the placeholders and get it reviewed).
- Review the cards and remove `"draft"` tags as you approve them.

## 5. Project map

```
app/                 routes: (tabs)/ Home · Saved · Us, deck/[slug], play/[slug], play/favorites,
                     session, welcome, signin, auth/callback, privacy, ~offline, api/account/delete,
                     opengraph images, manifest.ts, sw.ts (service worker)
components/          UI, grouped by feature (play/, share/, home/, onboarding/, settings/, pwa/, …)
hooks/               React hooks (play session, deck loading, favorites, settings)
lib/engine/          the card engine: pure TypeScript, no React, unit-tested
lib/content/         content types, loading, deck helpers, content tests
lib/db/              Dexie (IndexedDB) schema for guest data: settings, favorites, history, games in progress
lib/sync/            guest ⇄ account merge rules (tested) and the sync loop
lib/supabase/        browser client and auth helpers
lib/analytics/       event names and the cookieless PostHog wrapper
lib/prefs/           content filter, 18+ gate, "For you" ranking
lib/share/, lib/og/  share links, share images, Open Graph images
supabase/            SQL migration (tables and RLS policies), RLS tests, setup guide
content/             decks, categories, manifest
```

## 6. Quality targets

The latest audit (Phase 6, details in DECISIONS.md) checked:
- Initial JS under 300 KB gzipped on every page (185–214 KB).
- Swipes at 60 fps on a 4× slowed CPU, animating transform and opacity only.
- No WCAG 2.1 AA violations found by axe on any page or open dialog.
- Lighthouse mobile scores, and decks that play offline after being opened once.
