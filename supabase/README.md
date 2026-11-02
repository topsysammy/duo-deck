# Supabase setup (optional accounts + sync)

The app works fully without Supabase; sign-in simply stays hidden until these steps are done.

1. **Create a project** at supabase.com (pick the region closest to your users, e.g. `eu-west` for Nigeria).
2. **Run the migration:** SQL Editor → paste `migrations/0001_init.sql` → Run. (Or `supabase db push` with the Supabase CLI.)
3. **Auth → URL configuration**
   - Site URL: your production URL, e.g. `https://duodeck.app`
   - Redirect URLs: `https://duodeck.app/auth/callback`, `http://localhost:3000/auth/callback`, and your Vercel preview pattern (e.g. `https://*-yourteam.vercel.app/auth/callback`).
4. **Auth → Providers**
   - Email: on. Keep "Confirm email" on.
   - Google: on. Create an OAuth client in Google Cloud Console (type "Web application"), add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI, and paste the client ID and secret into Supabase.
5. **Auth → Email templates → "Magic Link" AND "Confirm signup":** a first-time user gets "Confirm signup", a returning one gets "Magic Link", so put the one-time code in both. People on iPhone (where the installed app and Safari don't share storage) need to type it:
   ```html
   <h2>Your Duo Deck sign-in</h2>
   <p><a href="{{ .ConfirmationURL }}">Tap to sign in</a></p>
   <p>Or type this code in the app: <strong>{{ .Token }}</strong></p>
   ```
   Supabase's built-in email sender only allows a few emails per hour and is meant for testing. Before launch, add your own SMTP provider (Resend, Brevo, Postmark…) under Auth → Emails → SMTP settings.
6. **Keys → `.env.local` and Vercel project settings:**
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public; RLS protects data)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only, used by `/api/account/delete`; never prefix with `NEXT_PUBLIC_`)

RLS is tested in `supabase/rls.test.ts` (runs the migration in PGlite): `npm test`.

## PostHog (analytics)

1. Create a project (EU cloud recommended) and copy the project API key into `NEXT_PUBLIC_POSTHOG_KEY` (and `NEXT_PUBLIC_POSTHOG_HOST`, e.g. `https://eu.i.posthog.com`).
2. **Project settings → enable "Cookieless server hash mode".** The app runs PostHog with `cookieless_mode: "always"`, and PostHog drops cookieless events unless this is on.
