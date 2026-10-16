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
4. Before inviting real users: **Authentication → Emails → SMTP Settings** → connect a real sender. Gmail works for testing (about 500 emails a day). For launch, use Resend (free for 3,000 emails a month): buy a domain (about $12/year), add it in Resend, paste the DNS records it shows into your domain registrar, then put Resend's SMTP details into Supabase with a sender like `hello@yourdomain.com`.

Never put the database password or the `service_role` / secret key in this repo or the app. The app only uses the public publishable key in `app/.env`.

## Make yourself an admin

After you've signed up in the app, run this once in the SQL Editor (use the email you signed in with):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'you@colorado.edu';
```

Then reopen the app → Profile → **Admin dashboard** (signups, activity, retention, matches, reports, bans, hoodie claims, events and seasons).

To download raw data as a spreadsheet: Supabase → Table Editor → pick a table → Export → CSV.

## Sample profiles (testing only)

`supabase/sample_data.sql` adds 12 fake CU students so you can see full profiles, the leaderboard and team boards. Four of them have already liked every admin. Remove them before real users join:

```sql
delete from auth.users where email like '%@sample.swirl.edu';
```

## Duos (double dates)

Two friends pair up (up to 3 duos each) and swipe on other pairs in Discover → Duo. A like only counts once both people in the duo say yes. When two duos like each other, all four get a group chat; when 3 of the 4 confirm the double date, everyone gets +30. The sample data gives every admin a duo with Sam, a sample guy, so you can try it alone.

## App Store reviewer account

Apple needs a login it can use. Follow the steps at the top of `supabase/reviewer_account.sql` (create `appreview@demo.swirl.edu` with a password in **Authentication → Users → Add user**, tick Auto Confirm, then run the file). Reviewers tap **Have a test account? Sign in with a password** on the sign-in screen.

## Shipping to TestFlight and the App Store

```bash
cd app
npx eas-cli@latest login
npx eas-cli@latest init                                   # links the app to your Expo account (also turns on push)
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest          # uploads to App Store Connect → TestFlight
```

Build numbers go up automatically. In App Store Connect you'll need: a Privacy Policy URL and Support URL (the published policies page has `#privacy` and `#support` sections), the reviewer login above, and age rating 17+ (dating apps).

Policies shown in the app live in `app/src/lib/legal.ts`. Set `SUPPORT_EMAIL` there once you have a support address.

## Support and crash reports

People can message you from **Profile → Help & support**. Admins get a push and see messages under **Admin → Support**, along with app errors and crashes (screen, phone type, app version).

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

Bigger group mode (3–4 people), daily picks, and automatic photo screening (needs a paid image-moderation service such as Sightengine or AWS Rekognition; for now, reports and admin review cover it). Tappable invite links in texts need a website domain (set `INVITE_URL` in `app/src/lib/constants.ts`); inside the app, `swirl://i/CODE` already fills in the invite code.
