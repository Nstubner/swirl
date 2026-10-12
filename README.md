# Swirl

A college dating app with a live, like-based campus leaderboard. Launching at CU Boulder first.

## What's here

- `app/` — the real iOS/Android app (Expo SDK 57, Expo Router, TypeScript).
- `supabase/schema.sql` — the whole backend: tables, row-level security, scoring, leaderboard, matching, chat, photo storage. Paste it into Supabase once.
- `prototype/Swirl.jsx` — the original clickable web prototype (design reference).

## One-time Supabase setup

1. Supabase dashboard → **SQL Editor** → New query → paste all of `supabase/schema.sql` → **Run**. It's safe to run again after updates.
2. **Authentication → Emails → Templates**: in both **Magic Link** and **Confirm signup**, add the code to the email body, e.g. `Your Swirl code is {{ .Token }}`. The app signs people in with a 6-digit code, not a link.
3. **Authentication → Sign In / Providers → Email**: keep email enabled. (Optional: set the OTP length to 6.)
4. Before inviting real users: **Authentication → Emails → SMTP Settings** → connect a real sender (Resend, Postmark, SendGrid). Supabase's built-in sender only allows a few emails per hour.

Never put the database password or the `service_role` / secret key in this repo or the app. The app only uses the public publishable key in `app/.env`.

## Make yourself an admin

After you've signed up in the app, run this once in the SQL Editor (use the email you signed in with):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'you@colorado.edu';
```

Then reopen the app → Profile → **Admin dashboard** (signups, activity, retention, matches, reports, bans, hoodie claims, events and seasons).

To download raw data as a spreadsheet: Supabase → Table Editor → pick a table → Export → CSV.

## Run it on your phone

```bash
cd app
npm install
npx expo start
```

Scan the QR code with the Camera app (iPhone) after installing **Expo Go** from the App Store.

## Checks

```bash
cd app
npx tsc --noEmit   # typecheck
npx expo lint      # lint
```

## How scoring works

Everyone starts each season at 1,000 (floor 500). Like received +8, Super Like +20, each weighted by the liker's score vs. yours (0.5×–2×), halved if the liker likes more than 80% of people, multiplied during events. Pass −2. First message within 24h of matching +10. Both send 5+ messages +5 each. Both confirm a date +30 each. Unmatching someone you never messaged −10. Tiers: Bronze < 900, Silver 900, Gold 1,100, Platinum 1,300, Diamond 1,500. Super Likes: 1 free per day plus earned ones.

Invites: each friend who finishes their profile = +2 Super Likes; 3 = 24h Boost; 5 = Founding Member badge; 10 = Swirl Founder badge + hoodie claim.

## Push notifications

The database sends pushes through Expo using the `pg_net` extension (the schema enables it). Phones only get a push token once the app is linked to an Expo project (`npx eas-cli@latest init`) and running as a real build (TestFlight); in Expo Go it quietly skips this.

## Team boards

Dorms and Greek chapters show once they have 5+ members. Points from your own teammates don't count, Greek boards count likes at half, and each person can change their dorm and chapter once per season. Admins can hide a team. Chapter lists (`GREEK_FRATERNITIES`, `GREEK_SORORITIES`) are in `app/src/lib/constants.ts`.

## Not built yet

Group mode, double dates, daily picks, privacy policy/terms pages, and an App Review demo account.
