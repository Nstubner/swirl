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

Everyone starts at 1,000 (floor 500). Like received +10, Super Like +25, each weighted by the liker's score vs. yours (0.5×–2×). Pass −3. First message within 24h of matching +5. Both confirm a date +15 each. Unmatching someone you never messaged −5. Tiers: Bronze < 900, Silver 900, Gold 1,100, Platinum 1,300, Diamond 1,500.

## Not built yet

Push notifications, Swirl Night events, group mode, rivalries, weekly recap, discovery filters, an App Review demo account, and an admin view for reports.
