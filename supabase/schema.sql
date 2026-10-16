-- =============================================================================
-- Swirl database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run, including on a database that already has an older version:
-- it adds new columns/tables and recreates Swirl's own functions and policies.
-- (Supabase will warn about "destructive operations" because of the
-- drop-and-recreate lines. That's expected; no data is deleted.)
--
-- What it creates
--   profiles        one row per student (created automatically on sign-up)
--   scores          Swirl Score per student (starts at 1000 each season)
--   score_events    log of every score change
--   swipes, matches, messages, blocks, reports
--   seasons         semester seasons + each person's final result
--   events          time-boxed events like Swirl Night (likes count extra)
--   reward_claims   hoodie claims from the invite program
--   daily_active    one row per person per day they opened the app (for metrics)
--   admins          who can see the admin dashboard
--   photos          storage bucket for profile pictures
--
-- Every write that touches a score or a reward goes through a server function,
-- so the app can never set its own score, badges or rewards.
-- =============================================================================


-- ---------- Tables ----------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  school      text not null default 'CU Boulder',
  name        text,
  birthday    date,
  gender      text check (gender in ('woman','man','nonbinary')),
  show_me     text check (show_me in ('women','men','everyone')),
  pronouns    text,
  major       text,
  grad_year   int,
  bio         text check (char_length(bio) <= 300),
  prompts     jsonb not null default '[]'::jsonb,
  interests   text[] not null default '{}',
  classes     text[] not null default '{}',
  dorm        text,
  spots       text[] not null default '{}',
  photos      text[] not null default '{}',
  visibility  text not null default 'tier' check (visibility in ('public','tier','hidden')),
  paused      boolean not null default false,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Added in v2 (invites, rewards, moderation, activity)
alter table public.profiles add column if not exists invite_code       text;
alter table public.profiles add column if not exists referred_by       uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists referral_credited boolean not null default false;
alter table public.profiles add column if not exists invites           int not null default 0;
alter table public.profiles add column if not exists bonus_supers      int not null default 0;
alter table public.profiles add column if not exists boost_until       timestamptz;
alter table public.profiles add column if not exists badges            text[] not null default '{}';
alter table public.profiles add column if not exists banned            boolean not null default false;
alter table public.profiles add column if not exists last_active_at    timestamptz;
create unique index if not exists profiles_invite_code on public.profiles (invite_code);

create table if not exists public.scores (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  score      int not null default 1000,
  peak_rank  int,
  updated_at timestamptz not null default now()
);

create table if not exists public.score_events (
  id             bigserial primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  delta          int not null,
  reason         text not null,
  source_user_id uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists score_events_user_time on public.score_events (user_id, created_at desc);

-- What powers the live "+8 · someone liked your photo" pop-ups. No names, just the points and why.
create table if not exists public.score_feed (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  delta      int not null,
  reason     text not null,
  item       text,
  created_at timestamptz not null default now()
);
create index if not exists score_feed_user_time on public.score_feed (user_id, created_at desc);
alter table public.score_events drop constraint if exists score_events_reason_check;
alter table public.score_events add constraint score_events_reason_check
  check (reason in ('like','super','pass','reply','convo','date','ghost','reset','season'));

create table if not exists public.swipes (
  swiper_id  uuid not null references public.profiles(id) on delete cascade,
  target_id  uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('like','super','pass')),
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index if not exists swipes_target on public.swipes (target_id);
create index if not exists swipes_swiper_time on public.swipes (swiper_id, created_at desc);

create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  a_bonus     boolean not null default false,   -- quick-reply bonus already paid to user_a
  b_bonus     boolean not null default false,
  a_date      boolean not null default false,   -- user_a confirmed "we went on a date"
  b_date      boolean not null default false,
  date_paid   boolean not null default false,
  last_message_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
alter table public.matches add column if not exists convo_paid boolean not null default false;

create table if not exists public.messages (
  id         bigserial primary key,
  match_id   uuid not null references public.matches(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_match_time on public.messages (match_id, created_at);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.reports (
  id          bigserial primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id   uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  details     text,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);
alter table public.reports add column if not exists resolved_at timestamptz;

create table if not exists public.seasons (
  id         serial primary key,
  name       text not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);
insert into public.seasons (name) select 'Season 1 · Fall ’26' where not exists (select 1 from public.seasons);

create table if not exists public.season_results (
  season_id int  not null references public.seasons(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  score     int  not null,
  rank      int  not null,
  total     int  not null,
  tier      text not null,
  primary key (season_id, user_id)
);

-- Final team standings for each finished season (Dorms and Greek boards).
create table if not exists public.season_team_results (
  season_id int  not null references public.seasons(id) on delete cascade,
  kind      text not null check (kind in ('dorm','greek')),
  name      text not null,
  rank      int  not null,
  members   int  not null,
  avg_points int not null,
  prize_status text not null default 'new' check (prize_status in ('new','sent')),
  primary key (season_id, kind, name)
);
alter table public.season_team_results enable row level security;
drop policy if exists "read team results" on public.season_team_results;
create policy "read team results" on public.season_team_results for select to authenticated using (true);

create table if not exists public.events (
  id          serial primary key,
  name        text not null,
  description text,
  multiplier  numeric not null default 2 check (multiplier between 1 and 5),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.reward_claims (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reward     text not null,
  size       text,
  contact    text,
  status     text not null default 'new' check (status in ('new','sent','cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id, reward)
);

create table if not exists public.daily_active (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);
create index if not exists daily_active_day on public.daily_active (day);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Added in v3 (Hinge-style likes, verification, push, Greek board)
alter table public.profiles add column if not exists captions            text[] not null default '{}';
alter table public.profiles add column if not exists looking_for         text;
alter table public.profiles add column if not exists greek               text;
alter table public.profiles add column if not exists filters             jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists push_enabled        boolean not null default true;
alter table public.profiles add column if not exists verified            boolean not null default false;
alter table public.profiles add column if not exists verification_status text not null default 'none';
alter table public.profiles add column if not exists verification_photo  text;
alter table public.profiles add column if not exists verification_pose   text;
alter table public.profiles add column if not exists dorm_changed_at     timestamptz;
alter table public.profiles add column if not exists greek_changed_at    timestamptz;
alter table public.profiles add column if not exists photo_locations     text[] not null default '{}';
alter table public.profiles add column if not exists birthday_changed_at timestamptz;
alter table public.profiles add column if not exists fav_spot          text;
alter table public.profiles add column if not exists fav_order         text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles drop constraint if exists profiles_fav_len;
alter table public.profiles add constraint profiles_fav_len check (char_length(fav_spot) <= 40 and char_length(fav_order) <= 60);
alter table public.matches add column if not exists a_read_at timestamptz;
alter table public.matches add column if not exists b_read_at timestamptz;

-- Crash and error reports sent by the app (visible in the admin dashboard).
create table if not exists public.app_errors (
  id         bigserial primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  message    text not null,
  stack      text,
  screen     text,
  platform   text,
  app_version text,
  created_at timestamptz not null default now()
);
create index if not exists app_errors_time on public.app_errors (created_at desc);

-- Messages sent from Profile → Help & support (visible in the admin dashboard).
create table if not exists public.feedback (
  id         bigserial primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  body       text not null check (char_length(body) between 1 and 2000),
  contact    text,
  status     text not null default 'new' check (status in ('new','done')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;   -- no policies: server functions only

alter table public.profiles drop constraint if exists profiles_major_len;
alter table public.profiles add constraint profiles_major_len check (char_length(major) <= 40);
alter table public.profiles drop constraint if exists profiles_classes_len;
alter table public.profiles add constraint profiles_classes_len check (coalesce(array_length(classes, 1), 0) <= 8);
alter table public.profiles drop constraint if exists profiles_looking_for_check;
alter table public.profiles add constraint profiles_looking_for_check
  check (looking_for is null or looking_for in ('serious','casual','unsure','friends'));
alter table public.profiles drop constraint if exists profiles_verification_status_check;
alter table public.profiles add constraint profiles_verification_status_check
  check (verification_status in ('none','pending','approved','rejected'));

alter table public.swipes add column if not exists item    text;     -- 'photo:0', 'prompt:1'
alter table public.swipes add column if not exists comment text check (char_length(comment) <= 200);

alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind in ('text','like_comment'));

create table if not exists public.push_tokens (
  token      text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now()
);

-- Teams (dorms or Greek chapters) an admin has hidden from the boards.
create table if not exists public.hidden_teams (
  kind text not null check (kind in ('dorm','greek')),
  name text not null,
  primary key (kind, name)
);

-- pg_net lets the database call Expo's push service directly (no extra server needed).
do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then raise notice 'pg_net not available; push notifications disabled';
end $$;

-- ---------- Helpers ---------------------------------------------------------

-- Swirl runs on Boulder time: "today" resets at midnight Mountain time.
create or replace function public.local_date() returns date
language sql stable as $$ select (now() at time zone 'America/Denver')::date $$;

create or replace function public.day_start(d date) returns timestamptz
language sql stable as $$ select (d::timestamp at time zone 'America/Denver') $$;

create or replace function public.tier_for(s int) returns text
language sql immutable as $$
  select case when s >= 1500 then 'diamond' when s >= 1300 then 'platinum'
              when s >= 1100 then 'gold' when s >= 900 then 'silver' else 'bronze' end
$$;

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

create or replace function public.season_start() returns timestamptz
language sql stable security definer set search_path = public as $$
  select coalesce((select started_at from seasons where ended_at is null order by id desc limit 1), '-infinity'::timestamptz)
$$;

create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare c text;
begin
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from profiles where invite_code = c);
  end loop;
  return c;
end $$;

-- Offensive-word filter for names, bios, prompts, captions, comments and messages.
create or replace function public.text_ok(t text) returns boolean
language sql immutable as $$
  select t is null or not (lower(t) ~ (
    '(n[i1!|]gg(a|er|uh|az)|f[a@]gg?[o0]t|\mf[a@]g\M|\mretard|\mtr[a@]nn(y|ie)|\mk[i1]ke\M|\msp[i1]c\M|\mch[i1]nk\M|'
    || '\mwetback|\mcoon\M|\mkys\M|kill yo(u|ur)self|\mrape\M|\mrapist)'
  ))
$$;

create or replace function public.check_text(t text) returns void
language plpgsql immutable as $$
begin
  if not text_ok(t) then raise exception 'Please remove offensive language and try again'; end if;
end $$;

-- Send a push notification to all of a person's phones through Expo. Never fails the caller.
create or replace function public.send_push(p_user uuid, p_title text, p_body text, p_url text) returns void
language plpgsql security definer set search_path = public as $$
declare msgs jsonb;
begin
  select jsonb_agg(jsonb_build_object('to', t.token, 'title', p_title, 'body', p_body, 'sound', 'default',
                                      'data', jsonb_build_object('url', p_url)))
    into msgs
  from push_tokens t join profiles p on p.id = t.user_id
  where t.user_id = p_user and p.push_enabled and not p.banned;
  if msgs is null then return; end if;
  perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := msgs,
                        headers := '{"Content-Type": "application/json"}'::jsonb);
exception when others then
  raise notice 'push failed: %', sqlerrm;
end $$;

-- Apply a score change with the 500 floor and log it.
create or replace function public.apply_score(p_user uuid, p_delta int, p_reason text, p_source uuid)
returns int language plpgsql security definer set search_path = public as $$
declare cur int; nxt int;
begin
  insert into scores (user_id) values (p_user) on conflict do nothing;
  select score into cur from scores where user_id = p_user for update;
  nxt := greatest(500, cur + p_delta);
  update scores set score = nxt, updated_at = now() where user_id = p_user;
  insert into score_events (user_id, delta, reason, source_user_id) values (p_user, nxt - cur, p_reason, p_source);
  return nxt - cur;
end $$;

-- Invite rewards. Runs when someone you invited finishes their profile.
--   every friend: +2 Super Likes · 3 friends: 24-hour Boost
--   5 friends: Founding Member badge · 10 friends: Swirl Founder badge + hoodie
create or replace function public.credit_invite(p_inviter uuid) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update profiles set invites = invites + 1, bonus_supers = bonus_supers + 2
   where id = p_inviter returning invites into n;
  if n is null then return; end if;
  if n = 3 then
    update profiles set boost_until = greatest(coalesce(boost_until, now()), now()) + interval '24 hours' where id = p_inviter;
  end if;
  if n >= 5 then
    update profiles set badges = badges || array['founding'] where id = p_inviter and not ('founding' = any(badges));
  end if;
  if n >= 10 then
    update profiles set badges = badges || array['founder'] where id = p_inviter and not ('founder' = any(badges));
  end if;
end $$;

-- Backfill invite codes for anyone who signed up before invites existed.
update public.profiles set invite_code = public.new_invite_code() where invite_code is null;

-- ---------- Sign-up: .edu only, auto-create profile + score -----------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or new.email !~* '^[^@\s]+@([a-z0-9-]+\.)+edu$' then
    raise exception 'Swirl is only for students with a .edu email';
  end if;
  insert into profiles (id, email, invite_code) values (new.id, lower(new.email), new_invite_code()) on conflict do nothing;
  insert into scores (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile guard: 18+, and the app can't edit email, rewards, badges or bans.
-- (Server functions run as the database owner, so they can.)
create or replace function public.check_profile() returns trigger
language plpgsql as $$
begin
  if new.birthday is not null and new.birthday > (current_date - interval '18 years') then
    raise exception 'Swirl is for students 18 and older';
  end if;
  new.email := old.email;
  if current_user in ('authenticated', 'anon') then
    new.invite_code := old.invite_code;     new.referred_by := old.referred_by;
    new.referral_credited := old.referral_credited;
    new.invites := old.invites;             new.bonus_supers := old.bonus_supers;
    new.boost_until := old.boost_until;     new.badges := old.badges;
    new.banned := old.banned;               new.created_at := old.created_at;
    new.last_active_at := old.last_active_at;
    new.verified := old.verified;           new.verification_status := old.verification_status;
    new.verification_photo := old.verification_photo;  new.verification_pose := old.verification_pose;
    new.dorm_changed_at := old.dorm_changed_at;         new.greek_changed_at := old.greek_changed_at;
    new.birthday_changed_at := old.birthday_changed_at;
    -- Terms: the server stamps the time; it can be set once and never cleared.
    new.terms_accepted_at := case when old.terms_accepted_at is null and new.terms_accepted_at is not null then now() else old.terms_accepted_at end;
    if new.onboarded and not old.onboarded and new.terms_accepted_at is null then
      raise exception 'Agree to the Terms and Privacy Policy to finish';
    end if;
    -- Birthday: free to set the first time; after that one change, then once every 6 months.
    if old.birthday is not null and new.birthday is distinct from old.birthday then
      if old.birthday_changed_at > now() - interval '6 months' then
        raise exception 'You can change your birthday once every 6 months';
      end if;
      new.birthday_changed_at := now();
    end if;
    -- Dorm and Greek chapter can each change once per season after you've finished your profile.
    if old.onboarded and new.dorm is distinct from old.dorm and old.dorm is not null then
      if old.dorm_changed_at >= season_start() then
        raise exception 'You can change your dorm once per season';
      end if;
      new.dorm_changed_at := now();
    end if;
    if old.onboarded and new.greek is distinct from old.greek and old.greek is not null then
      if old.greek_changed_at >= season_start() then
        raise exception 'You can change your Greek chapter once per season';
      end if;
      new.greek_changed_at := now();
    end if;
  end if;
  perform check_text(new.name);
  perform check_text(new.bio);
  perform check_text(new.prompts::text);
  perform check_text(array_to_string(new.captions, ' '));
  perform check_text(new.major);
  perform check_text(array_to_string(new.classes, ' '));
  perform check_text(array_to_string(new.photo_locations, ' '));
  perform check_text(new.fav_spot);
  perform check_text(new.fav_order);
  return new;
end $$;

drop trigger if exists profiles_check on public.profiles;
create trigger profiles_check before update on public.profiles
  for each row execute function public.check_profile();

-- Finishing your profile credits whoever invited you (once).
create or replace function public.after_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.onboarded and not old.onboarded and new.referred_by is not null and not new.referral_credited then
    -- The friend who joined gets a 24-hour Boost so their first day is busy.
    update profiles set referral_credited = true, boost_until = greatest(coalesce(boost_until, now()), now()) + interval '24 hours' where id = new.id;
    perform credit_invite(new.referred_by);
    perform send_push(new.referred_by, coalesce(new.name, 'Your friend') || ' joined Swirl 🎉',
                      'You earned 2 Super Likes. Make them your duo for double dates?', '/duos');
  end if;
  return null;
end $$;

drop trigger if exists profiles_after_update on public.profiles;
create trigger profiles_after_update after update on public.profiles
  for each row execute function public.after_profile_update();

-- ---------- Row level security ----------------------------------------------

alter table public.profiles       enable row level security;
alter table public.scores         enable row level security;
alter table public.score_events   enable row level security;
alter table public.swipes         enable row level security;
alter table public.matches        enable row level security;
alter table public.messages       enable row level security;
alter table public.blocks         enable row level security;
alter table public.reports        enable row level security;
alter table public.seasons        enable row level security;
alter table public.season_results enable row level security;
alter table public.events         enable row level security;
alter table public.reward_claims  enable row level security;
alter table public.daily_active   enable row level security;
alter table public.admins         enable row level security;   -- no policies: only server functions read it
alter table public.push_tokens    enable row level security;   -- no policies: server functions only
alter table public.hidden_teams   enable row level security;   -- no policies: server functions only
alter table public.app_errors     enable row level security;   -- no policies: server functions only

drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or (onboarded and not banned and not is_blocked(auth.uid(), id)));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read own score" on public.scores;
create policy "read own score" on public.scores for select to authenticated using (user_id = auth.uid());

-- Score history is read only through server functions: rows name who liked you (source_user_id),
-- and "Likes you" is a reward for inviting friends.
drop policy if exists "read own score events" on public.score_events;

drop policy if exists "read own swipes" on public.swipes;
create policy "read own swipes" on public.swipes for select to authenticated using (swiper_id = auth.uid());

drop policy if exists "read own matches" on public.matches;
create policy "read own matches" on public.matches for select to authenticated
  using (auth.uid() in (user_a, user_b));

drop policy if exists "read messages in my matches" on public.messages;
create policy "read messages in my matches" on public.messages for select to authenticated
  using (exists (select 1 from matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b)));

drop policy if exists "send messages in my matches" on public.messages;
create policy "send messages in my matches" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and not exists (select 1 from profiles where id = auth.uid() and banned)
    and exists (select 1 from matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b)
                and not is_blocked(m.user_a, m.user_b))
  );

drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "unblock" on public.blocks;
create policy "unblock" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

drop policy if exists "file reports" on public.reports;
create policy "file reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "read seasons" on public.seasons;
create policy "read seasons" on public.seasons for select to authenticated using (true);

drop policy if exists "read own season results" on public.season_results;
create policy "read own season results" on public.season_results for select to authenticated using (user_id = auth.uid());

drop policy if exists "read events" on public.events;
create policy "read events" on public.events for select to authenticated using (true);

drop policy if exists "read own claims" on public.reward_claims;
create policy "read own claims" on public.reward_claims for select to authenticated using (user_id = auth.uid());

-- ---------- Activity (for metrics) -------------------------------------------

-- Called by the app when it opens. One row per person per day.
create or replace function public.ping() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into daily_active (user_id, day) values (auth.uid(), local_date()) on conflict do nothing;
  update profiles set last_active_at = now() where id = auth.uid();
end $$;

create or replace function public.register_push(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(p_token, '') = '' then return; end if;
  insert into push_tokens (token, user_id) values (p_token, auth.uid())
    on conflict (token) do update set user_id = excluded.user_id, updated_at = now();
end $$;

create or replace function public.unregister_push(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid()
$$;

-- ---------- Discover deck ----------------------------------------------------

-- People you haven't swiped on, who you'd see and who'd see you.
-- Order: people who Super Liked you, then Boosted profiles, then mostly people near your score
-- (with some shuffle so you still see a mix), with a small bump for people who already liked you.
drop function if exists public.get_deck(int);
create function public.get_deck(p_limit int default 30)
returns table (id uuid, name text, age int, gender text, pronouns text, major text, grad_year int, bio text,
               prompts jsonb, interests text[], classes text[], dorm text, spots text[], photos text[],
               tier text, super_liked_me boolean, badges text[], captions text[], looking_for text, greek text,
               verified boolean, liked_me_item text, liked_me_comment text, photo_locations text[], fav_spot text, fav_order text,
               near_rank boolean, is_new boolean, boosted boolean)
language sql volatile security definer set search_path = public as $$
  with me as (select pr.*, coalesce((select score from scores where user_id = pr.id), 1000) as my_score from profiles pr where pr.id = auth.uid())
  select p.id, p.name, date_part('year', age(p.birthday))::int, p.gender, p.pronouns, p.major, p.grad_year, p.bio,
         p.prompts, p.interests, p.classes, p.dorm, p.spots, p.photos,
         case when p.visibility = 'hidden' then null else tier_for(coalesce(s.score, 1000)) end,
         coalesce(x.kind = 'super', false), p.badges, p.captions, p.looking_for, p.greek, p.verified,
         x.item, x.comment, p.photo_locations, p.fav_spot, p.fav_order,
         p.visibility <> 'hidden' and abs(coalesce(s.score, 1000) - me.my_score) <= 150,
         p.created_at > now() - interval '3 days',
         coalesce(p.boost_until, '-infinity') > now()
  from profiles p
  cross join me
  left join scores s on s.user_id = p.id
  left join swipes x on x.swiper_id = p.id and x.target_id = me.id and x.kind in ('like','super')
  where p.id <> me.id and p.onboarded and not p.paused and not p.banned and not me.paused and not me.banned
    and not exists (select 1 from swipes w where w.swiper_id = me.id and w.target_id = p.id)
    and not is_blocked(me.id, p.id)
    and (me.show_me = 'everyone' or (me.show_me = 'women' and p.gender = 'woman') or (me.show_me = 'men' and p.gender = 'man'))
    and (p.show_me = 'everyone' or (p.show_me = 'women' and me.gender = 'woman') or (p.show_me = 'men' and me.gender = 'man'))
    -- your filters (Discover → filter button)
    and (coalesce(jsonb_array_length(me.filters->'years'), 0) = 0 or p.grad_year::text in (select jsonb_array_elements_text(me.filters->'years')))
    and (coalesce(jsonb_array_length(me.filters->'looking'), 0) = 0 or p.looking_for in (select jsonb_array_elements_text(me.filters->'looking')))
    and (coalesce((me.filters->>'verified_only')::boolean, false) = false or p.verified)
  order by coalesce(x.kind = 'super', false) desc,
           (coalesce(p.boost_until, '-infinity') > now()) desc,
           abs(coalesce(s.score, 1000) - me.my_score) + random() * 250 - case when x.swiper_id is not null then 120 else 0 end
  limit p_limit
$$;

-- ---------- Duos (2-on-2 double dates) ----------------------------------------
--
-- You and a friend form a duo (up to 3 duos each). Your duo swipes on other duos.
-- A like only counts once both of you say yes. When two duos like each other,
-- all four land in one group chat. A confirmed double date is +30 each.

create table if not exists public.duos (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  invited_by  uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','active')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists duos_b on public.duos (user_b);

create table if not exists public.duo_votes (
  from_duo   uuid not null references public.duos(id) on delete cascade,
  to_duo     uuid not null references public.duos(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  vote       text not null check (vote in ('like','pass')),
  created_at timestamptz not null default now(),
  primary key (from_duo, to_duo, user_id)
);
create index if not exists duo_votes_to on public.duo_votes (to_duo);

create table if not exists public.duo_matches (
  id              uuid primary key default gen_random_uuid(),
  duo_a           uuid references public.duos(id) on delete set null,
  duo_b           uuid references public.duos(id) on delete set null,
  members         uuid[] not null,
  confirms        uuid[] not null default '{}',
  date_paid       boolean not null default false,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);
create index if not exists duo_matches_members on public.duo_matches using gin (members);

create table if not exists public.duo_messages (
  id         bigserial primary key,
  match_id   uuid not null references public.duo_matches(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists duo_messages_match_time on public.duo_messages (match_id, created_at);

alter table public.duos         enable row level security;
alter table public.duo_votes    enable row level security;   -- server functions only
alter table public.duo_matches  enable row level security;
alter table public.duo_messages enable row level security;
drop policy if exists "read my duos" on public.duos;
create policy "read my duos" on public.duos for select to authenticated using (auth.uid() in (user_a, user_b));
drop policy if exists "read my duo matches" on public.duo_matches;
create policy "read my duo matches" on public.duo_matches for select to authenticated using (auth.uid() = any(members));
drop policy if exists "read my duo messages" on public.duo_messages;
create policy "read my duo messages" on public.duo_messages for select to authenticated
  using (exists (select 1 from duo_matches m where m.id = match_id and auth.uid() = any(m.members)));
drop policy if exists "send my duo messages" on public.duo_messages;
create policy "send my duo messages" on public.duo_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from duo_matches m where m.id = match_id and auth.uid() = any(m.members)));

-- Would a want to see b (by "Show me")?
create or replace function public.wants(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select x.show_me = 'everyone' or (x.show_me = 'women' and y.gender = 'woman') or (x.show_me = 'men' and y.gender = 'man')
                   from profiles x, profiles y where x.id = a and y.id = b), false)
$$;

create or replace function public.duo_partner(p_duo uuid, p_me uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select case when user_a = p_me then user_b when user_b = p_me then user_a end from duos where id = p_duo
$$;

-- Compact profile for duo cards (same fields Discover uses).
create or replace function public.person_card(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'age', date_part('year', age(p.birthday))::int, 'gender', p.gender, 'pronouns', p.pronouns,
    'major', p.major, 'grad_year', p.grad_year, 'bio', p.bio, 'prompts', p.prompts, 'interests', p.interests,
    'classes', p.classes, 'dorm', p.dorm, 'spots', p.spots, 'photos', p.photos,
    'tier', case when p.visibility = 'hidden' then null else tier_for(coalesce(s.score, 1000)) end,
    'badges', p.badges, 'captions', p.captions, 'looking_for', p.looking_for, 'greek', p.greek, 'verified', p.verified,
    'photo_locations', p.photo_locations, 'fav_spot', p.fav_spot, 'fav_order', p.fav_order)
  from profiles p left join scores s on s.user_id = p.id where p.id = p_id
$$;

-- Your duos (active and pending), newest first.
create or replace function public.get_my_duos()
returns table (duo_id uuid, partner_id uuid, partner_name text, partner_photo text, status text, invited_by_me boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, o.id, o.name, o.photos[1], d.status, d.invited_by = auth.uid(), d.created_at
  from duos d join profiles o on o.id = case when d.user_a = auth.uid() then d.user_b else d.user_a end
  where auth.uid() in (d.user_a, d.user_b) and not o.banned
  order by (d.status = 'pending' and d.invited_by <> auth.uid()) desc, d.created_at desc
$$;

-- Friends you invited (or who invited you) that you could duo with.
create or replace function public.get_duo_suggestions()
returns table (id uuid, name text, photo text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.photos[1] from profiles p, profiles me
  where me.id = auth.uid() and p.id <> me.id and p.onboarded and not p.banned and not is_blocked(me.id, p.id)
    and (p.referred_by = me.id or me.referred_by = p.id)
    and not exists (select 1 from duos d where d.user_a = least(me.id, p.id) and d.user_b = greatest(me.id, p.id))
  order by p.created_at desc limit 20
$$;

-- Ask a friend to be your duo, by their invite code or from your suggestions.
create or replace function public.duo_invite(p_user uuid default null, p_code text default null) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f profiles; my_name text; d duos;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_user is not null then select * into f from profiles where id = p_user;
  else select * into f from profiles where invite_code = upper(trim(coalesce(p_code, ''))); end if;
  if f.id is null or not f.onboarded or f.banned then return json_build_object('ok', false, 'error', 'No one on Swirl has that code.'); end if;
  if f.id = me then return json_build_object('ok', false, 'error', 'That’s your own code.'); end if;
  if is_blocked(me, f.id) then return json_build_object('ok', false, 'error', 'You can’t duo with this person.'); end if;
  select * into d from duos where user_a = least(me, f.id) and user_b = greatest(me, f.id);
  if d.id is not null then
    if d.status = 'pending' and d.invited_by = f.id then
      update duos set status = 'active', accepted_at = now() where id = d.id;
      return json_build_object('ok', true, 'name', f.name, 'status', 'active');
    end if;
    return json_build_object('ok', true, 'name', f.name, 'status', d.status);
  end if;
  if (select count(*) from duos where me in (user_a, user_b)) >= 3 then
    return json_build_object('ok', false, 'error', 'You can have up to 3 duos. Leave one to add another.');
  end if;
  if (select count(*) from duos where f.id in (user_a, user_b)) >= 3 then
    return json_build_object('ok', false, 'error', f.name || ' already has 3 duos.');
  end if;
  insert into duos (user_a, user_b, invited_by) values (least(me, f.id), greatest(me, f.id), me);
  select name into my_name from profiles where id = me;
  perform send_push(f.id, 'Duo request', coalesce(my_name, 'A friend') || ' wants to be your duo for double dates.', '/duos');
  return json_build_object('ok', true, 'name', f.name, 'status', 'pending');
end $$;

create or replace function public.duo_respond(p_duo uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare d duos; my_name text;
begin
  select * into d from duos where id = p_duo and auth.uid() in (user_a, user_b) and status = 'pending' and invited_by <> auth.uid();
  if d.id is null then raise exception 'That duo request is gone'; end if;
  if p_accept then
    update duos set status = 'active', accepted_at = now() where id = d.id;
    select name into my_name from profiles where id = auth.uid();
    perform send_push(d.invited_by, 'You have a duo', coalesce(my_name, 'Your friend') || ' said yes. Go find a double date.', '/discover');
  else
    delete from duos where id = d.id;
  end if;
end $$;

-- Leave a duo (or cancel a request). Group chats you already have stay.
create or replace function public.duo_leave(p_duo uuid) returns void
language sql security definer set search_path = public as $$
  delete from duos where id = p_duo and auth.uid() in (user_a, user_b)
$$;

-- Duos your duo can see: both of them fit what both of you want (and the other way around),
-- nobody is blocked, you haven't voted on them, and nobody you've passed on (in any duo) is in it.
-- Each person shows up in at most one card.
create or replace function public.get_duo_deck(p_duo uuid, p_limit int default 20)
returns table (duo_id uuid, a jsonb, b jsonb, liked_us boolean)
language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare me uuid := auth.uid(); mate uuid; r record; seen uuid[] := '{}'; n int := 0;
begin
  mate := duo_partner(p_duo, me);
  if mate is null or not exists (select 1 from duos where id = p_duo and status = 'active') then raise exception 'Pick an active duo first'; end if;
  for r in
    select d.id, d.user_a, d.user_b,
           (select count(*) from duo_votes v where v.from_duo = d.id and v.to_duo = p_duo and v.vote = 'like') = 2 as liked_us
    from duos d
    join profiles pa on pa.id = d.user_a join profiles pb on pb.id = d.user_b
    where d.status = 'active' and d.id <> p_duo
      and d.user_a not in (me, mate) and d.user_b not in (me, mate)
      and pa.onboarded and pb.onboarded and not pa.banned and not pb.banned and not pa.paused and not pb.paused
      and wants(me, d.user_a) and wants(me, d.user_b) and wants(mate, d.user_a) and wants(mate, d.user_b)
      and wants(d.user_a, me) and wants(d.user_a, mate) and wants(d.user_b, me) and wants(d.user_b, mate)
      and not is_blocked(me, d.user_a) and not is_blocked(me, d.user_b) and not is_blocked(mate, d.user_a) and not is_blocked(mate, d.user_b)
      and not exists (select 1 from duo_votes v where v.from_duo = p_duo and v.to_duo = d.id and (v.user_id = me or v.vote = 'pass'))
      and not exists (select 1 from duo_matches m where (m.duo_a = p_duo and m.duo_b = d.id) or (m.duo_a = d.id and m.duo_b = p_duo))
      and not exists (select 1 from duo_votes v join duos fd on fd.id = v.from_duo join duos td on td.id = v.to_duo
                      where v.vote = 'pass' and me in (fd.user_a, fd.user_b) and (d.user_a in (td.user_a, td.user_b) or d.user_b in (td.user_a, td.user_b)))
    order by 4 desc, random()
  loop
    continue when r.user_a = any(seen) or r.user_b = any(seen);
    seen := seen || array[r.user_a, r.user_b];
    duo_id := r.id; a := person_card(r.user_a); b := person_card(r.user_b); liked_us := r.liked_us;
    return next;
    n := n + 1;
    exit when n >= p_limit;
  end loop;
end $$;

-- Like or pass on another duo for your duo. A like only goes through when both of you said like.
create or replace function public.duo_vote(p_duo uuid, p_target uuid, p_vote text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); mate uuid; mate_vote text; t duos; mid uuid; my_name text; them_names text; x uuid;
begin
  if p_vote not in ('like','pass') then raise exception 'Bad vote'; end if;
  mate := duo_partner(p_duo, me);
  if mate is null or not exists (select 1 from duos where id = p_duo and status = 'active') then raise exception 'Pick an active duo first'; end if;
  select * into t from duos where id = p_target and status = 'active';
  if t.id is null or p_target = p_duo then raise exception 'That duo isn’t available anymore'; end if;
  insert into duo_votes (from_duo, to_duo, user_id, vote) values (p_duo, p_target, me, p_vote)
    on conflict (from_duo, to_duo, user_id) do update set vote = excluded.vote, created_at = now();
  if p_vote = 'pass' then return json_build_object('matched', false); end if;

  select vote into mate_vote from duo_votes where from_duo = p_duo and to_duo = p_target and user_id = mate;
  select string_agg(name, ' & ' order by name) into them_names from profiles where id in (t.user_a, t.user_b);
  if mate_vote is null then
    select name into my_name from profiles where id = me;
    perform send_push(mate, 'Double date?', coalesce(my_name, 'Your duo') || ' likes ' || coalesce(them_names, 'a duo') || '. You in?', '/duos');
    return json_build_object('matched', false, 'waiting', true);
  elsif mate_vote = 'pass' then
    return json_build_object('matched', false, 'mate_passed', true);
  end if;

  -- Both of us like them. Do both of them like us?
  if (select count(*) from duo_votes where from_duo = p_target and to_duo = p_duo and vote = 'like') = 2 then
    select id into mid from duo_matches where (duo_a = p_duo and duo_b = p_target) or (duo_a = p_target and duo_b = p_duo);
    if mid is null then
      insert into duo_matches (duo_a, duo_b, members) values (p_duo, p_target, array[me, mate, t.user_a, t.user_b]) returning id into mid;
      foreach x in array array[me, mate, t.user_a, t.user_b] loop
        perform send_push(x, 'Double date match! 🌀', 'Your duo matched. Say hi in the group chat.', '/duo-chat/' || mid);
      end loop;
    end if;
    return json_build_object('matched', true, 'match_id', mid);
  end if;
  return json_build_object('matched', false, 'sent', true);
end $$;

-- Duos your partner liked that are waiting on your answer.
create or replace function public.get_duo_pending()
returns table (duo_id uuid, target_id uuid, partner_name text, a jsonb, b jsonb)
language sql stable security definer set search_path = public as $$
  select d.id, v.to_duo, pp.name, person_card(t.user_a), person_card(t.user_b)
  from duos d
  join duo_votes v on v.from_duo = d.id and v.vote = 'like' and v.user_id = duo_partner(d.id, auth.uid())
  join duos t on t.id = v.to_duo and t.status = 'active'
  join profiles pp on pp.id = v.user_id
  where d.status = 'active' and auth.uid() in (d.user_a, d.user_b)
    and not exists (select 1 from duo_votes w where w.from_duo = d.id and w.to_duo = v.to_duo and w.user_id = auth.uid())
    and not is_blocked(auth.uid(), t.user_a) and not is_blocked(auth.uid(), t.user_b)
  order by v.created_at desc
$$;

-- Your double-date group chats.
create or replace function public.get_duo_matches()
returns table (match_id uuid, created_at timestamptz, people jsonb, last_body text, last_sender text, last_at timestamptz, date_paid boolean, i_confirmed boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.created_at,
         (select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'photo', p.photos[1]) order by p.id = auth.uid(), p.name)
            from profiles p where p.id = any(m.members)),
         lm.body, (select name from profiles where id = lm.sender_id), lm.created_at, m.date_paid, auth.uid() = any(m.confirms)
  from duo_matches m
  left join lateral (select body, sender_id, created_at from duo_messages x where x.match_id = m.id order by x.created_at desc limit 1) lm on true
  where auth.uid() = any(m.members)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- "We went on a double date": once 3 of the 4 confirm, everyone gets +30.
create or replace function public.duo_confirm_date(p_match uuid) returns json
language plpgsql security definer set search_path = public as $$
declare m duo_matches; x uuid; n int;
begin
  select * into m from duo_matches where id = p_match and auth.uid() = any(members) for update;
  if m.id is null then raise exception 'That group chat is gone'; end if;
  if not auth.uid() = any(m.confirms) then
    update duo_matches set confirms = confirms || auth.uid() where id = m.id returning * into m;
  end if;
  n := cardinality(m.confirms);
  if n >= 3 and not m.date_paid then
    update duo_matches set date_paid = true where id = m.id;
    foreach x in array m.members loop perform apply_score(x, 30, 'date', null); end loop;
    return json_build_object('count', n, 'paid', true);
  end if;
  return json_build_object('count', n, 'paid', m.date_paid);
end $$;

create or replace function public.check_duo_message() returns trigger
language plpgsql as $$
begin
  perform check_text(new.body);
  if current_user in ('authenticated', 'anon') then
    if (select count(*) from duo_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
      raise exception 'You''re sending messages too fast. Wait a moment';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists duo_messages_before_insert on public.duo_messages;
create trigger duo_messages_before_insert before insert on public.duo_messages
  for each row execute function public.check_duo_message();

create or replace function public.on_duo_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare m duo_matches; x uuid; sender_name text;
begin
  update duo_matches set last_message_at = new.created_at where id = new.match_id returning * into m;
  select name into sender_name from profiles where id = new.sender_id;
  foreach x in array m.members loop
    if x <> new.sender_id then perform send_push(x, coalesce(sender_name, 'Double date'), left(new.body, 120), '/duo-chat/' || m.id); end if;
  end loop;
  return new;
end $$;
drop trigger if exists duo_messages_after_insert on public.duo_messages;
create trigger duo_messages_after_insert after insert on public.duo_messages
  for each row execute function public.on_duo_message();

-- Active duo partners' names, for the "Duo with Jake" chip on profiles.
create or replace function public.duo_partner_names(p_user uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(o.name order by d.accepted_at), '{}')
  from duos d join profiles o on o.id = case when d.user_a = p_user then d.user_b else d.user_a end
  where d.status = 'active' and p_user in (d.user_a, d.user_b) and not o.banned and o.onboarded
$$;

-- One person's profile (chat headers, "view profile", previewing your own).
drop function if exists public.get_person(uuid);
create function public.get_person(p_id uuid)
returns table (id uuid, name text, age int, gender text, pronouns text, major text, grad_year int, bio text,
               prompts jsonb, interests text[], classes text[], dorm text, spots text[], photos text[], tier text,
               badges text[], captions text[], looking_for text, greek text, verified boolean,
               liked_me_item text, liked_me_comment text, super_liked_me boolean, i_swiped boolean, liked_me boolean,
               photo_locations text[], fav_spot text, fav_order text, duo_with text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.name, date_part('year', age(p.birthday))::int, p.gender, p.pronouns, p.major, p.grad_year, p.bio,
         p.prompts, p.interests, p.classes, p.dorm, p.spots, p.photos,
         case when p.visibility = 'hidden' and p.id <> auth.uid() then null else tier_for(coalesce(s.score, 1000)) end,
         p.badges, p.captions, p.looking_for, p.greek, p.verified,
         x.item, x.comment, coalesce(x.kind = 'super', false),
         exists (select 1 from swipes w where w.swiper_id = auth.uid() and w.target_id = p.id),
         x.swiper_id is not null, p.photo_locations, p.fav_spot, p.fav_order, duo_partner_names(p.id)
  from profiles p left join scores s on s.user_id = p.id
  left join swipes x on x.swiper_id = p.id and x.target_id = auth.uid() and x.kind in ('like','super')
  where p.id = p_id and (p.id = auth.uid() or is_admin() or (p.onboarded and not p.banned and not is_blocked(auth.uid(), p.id)
    -- Paused people only open for people they've matched or double-dated with.
    and (not p.paused
         or exists (select 1 from matches m where (m.user_a = p.id and m.user_b = auth.uid()) or (m.user_b = p.id and m.user_a = auth.uid()))
         or exists (select 1 from duo_matches dm where p.id = any(dm.members) and auth.uid() = any(dm.members)))))
$$;

-- ---------- Swiping + scoring -------------------------------------------------
--
-- Like received +8, Super Like +20. Each is weighted by the liker's score vs yours
-- (0.5×–2×), halved if the liker likes almost everyone (more than 80% of their
-- last 30 swipes), and multiplied during events like Swirl Night.
-- Pass received −2. Floor 500.
-- Super Likes: 1 free per day (Boulder time) plus any you've earned from invites.

drop function if exists public.swipe(uuid, text);
create or replace function public.swipe(p_target uuid, p_kind text, p_item text default null, p_comment text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_score int; their_score int; base int; mult numeric; ev numeric; n_recent int; n_likes int; delta int;
  used int; mutual boolean; mid uuid; a uuid; b uuid; their swipes; my_name text; their_name text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_kind not in ('like','super','pass') then raise exception 'Bad swipe'; end if;
  if p_target = me or is_blocked(me, p_target) then raise exception 'Not allowed'; end if;
  if exists (select 1 from profiles where id = me and banned) then raise exception 'Account suspended'; end if;
  if exists (select 1 from swipes where swiper_id = me and target_id = p_target) then
    return json_build_object('matched', false, 'duplicate', true);
  end if;

  -- Spam limit: 150 likes a day is far more than any real person needs.
  if p_kind in ('like','super') and (select count(*) from swipes where swiper_id = me and kind in ('like','super')
                                       and created_at >= day_start(local_date())) >= 150 then
    raise exception 'Daily like limit reached. Come back tomorrow';
  end if;

  if p_kind = 'super' then
    select count(*) into used from swipes where swiper_id = me and kind = 'super' and created_at >= day_start(local_date());
    if used >= 1 then
      update profiles set bonus_supers = bonus_supers - 1 where id = me and bonus_supers > 0;
      if not found then raise exception 'Out of Super Likes'; end if;
    end if;
  end if;

  p_comment := nullif(trim(p_comment), '');
  if p_kind = 'pass' then p_comment := null; p_item := null; end if;
  perform check_text(p_comment);
  insert into swipes (swiper_id, target_id, kind, item, comment) values (me, p_target, p_kind, p_item, left(p_comment, 200))
    on conflict (swiper_id, target_id) do nothing;
  if not found then return json_build_object('matched', false, 'duplicate', true); end if;

  if p_kind = 'pass' then
    delta := -2;
  else
    select coalesce((select score from scores where user_id = me), 1000) into my_score;
    select coalesce((select score from scores where user_id = p_target), 1000) into their_score;
    base := case when p_kind = 'super' then 20 else 8 end;
    mult := least(2, greatest(0.5, my_score::numeric / greatest(1, their_score)));
    select count(*), count(*) filter (where kind <> 'pass') into n_recent, n_likes
      from (select kind from swipes where swiper_id = me order by created_at desc limit 30) t;
    if n_recent >= 15 and n_likes::numeric / n_recent > 0.8 then mult := mult * 0.5; end if;
    select coalesce(max(multiplier), 1) into ev from events where now() >= starts_at and now() < ends_at;
    delta := greatest(1, round(base * mult * ev));
  end if;
  perform apply_score(p_target, delta, p_kind, me);

  if p_kind in ('like','super') then
    select exists (select 1 from swipes where swiper_id = p_target and target_id = me and kind in ('like','super')) into mutual;
    if mutual then
      a := least(me, p_target); b := greatest(me, p_target);
      insert into matches (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing returning id into mid;
      if mid is null then
        select id into mid from matches where user_a = a and user_b = b;
      else
        -- Like comments become the first messages of the chat (theirs first, it came earlier).
        select * into their from swipes where swiper_id = p_target and target_id = me;
        if their.comment is not null then
          insert into messages (match_id, sender_id, body, kind, created_at) values (mid, p_target, their.comment, 'like_comment', now() - interval '1 second');
        end if;
        if p_comment is not null then
          insert into messages (match_id, sender_id, body, kind) values (mid, me, p_comment, 'like_comment');
        end if;
        select name into my_name from profiles where id = me;
        perform send_push(p_target, 'It''s a Swirl!', 'You and ' || coalesce(my_name, 'someone') || ' liked each other.', '/chat/' || mid);
      end if;
      return json_build_object('matched', true, 'match_id', mid);
    end if;
  end if;
  return json_build_object('matched', false);
end $$;

-- Quick reply: +10 the first time you message a match within 24 hours of matching.
-- Real conversation: +5 each once you've both sent at least 5 messages.
create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare m matches; ca int; cb int; other uuid; sender_name text;
begin
  select * into m from matches where id = new.match_id for update;
  update matches set last_message_at = new.created_at where id = m.id;
  if new.kind <> 'text' then return new; end if;   -- like comments don't earn bonuses or pings
  other := case when new.sender_id = m.user_a then m.user_b else m.user_a end;
  select name into sender_name from profiles where id = new.sender_id;
  perform send_push(other, coalesce(sender_name, 'New message'), left(new.body, 120), '/chat/' || m.id);
  if new.created_at - m.created_at <= interval '24 hours' then
    if new.sender_id = m.user_a and not m.a_bonus then
      update matches set a_bonus = true where id = m.id;
      perform apply_score(m.user_a, 10, 'reply', null);
    elsif new.sender_id = m.user_b and not m.b_bonus then
      update matches set b_bonus = true where id = m.id;
      perform apply_score(m.user_b, 10, 'reply', null);
    end if;
  end if;
  if not m.convo_paid then
    select count(*) filter (where sender_id = m.user_a), count(*) filter (where sender_id = m.user_b)
      into ca, cb from messages where match_id = m.id;
    if ca >= 5 and cb >= 5 then
      update matches set convo_paid = true where id = m.id;
      perform apply_score(m.user_a, 5, 'convo', m.user_b);
      perform apply_score(m.user_b, 5, 'convo', m.user_a);
    end if;
  end if;
  return new;
end $$;

create or replace function public.check_message() returns trigger
language plpgsql as $$
begin
  perform check_text(new.body);
  if current_user in ('authenticated', 'anon') then
    new.kind := 'text';
    -- Spam limit: at most 20 messages a minute.
    if (select count(*) from messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
      raise exception 'You''re sending messages too fast. Wait a moment';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.check_message();

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message();

-- "We went on a date": +30 each once both people confirm.
create or replace function public.confirm_date(p_match uuid) returns json
language plpgsql security definer set search_path = public as $$
declare m matches; me uuid := auth.uid();
begin
  select * into m from matches where id = p_match and me in (user_a, user_b) for update;
  if m.id is null then raise exception 'Match not found'; end if;
  if me = m.user_a then update matches set a_date = true where id = m.id returning * into m;
  else update matches set b_date = true where id = m.id returning * into m; end if;
  if m.a_date and m.b_date and not m.date_paid then
    update matches set date_paid = true where id = m.id;
    perform apply_score(m.user_a, 30, 'date', m.user_b);
    perform apply_score(m.user_b, 30, 'date', m.user_a);
    return json_build_object('both', true);
  end if;
  return json_build_object('both', false);
end $$;

-- Unmatch. −10 if you never sent a single message (ghosting).
create or replace function public.unmatch(p_match uuid) returns json
language plpgsql security definer set search_path = public as $$
declare m matches; me uuid := auth.uid(); replied boolean;
begin
  select * into m from matches where id = p_match and me in (user_a, user_b);
  if m.id is null then raise exception 'Match not found'; end if;
  select exists (select 1 from messages where match_id = m.id and sender_id = me) into replied;
  delete from matches where id = m.id;
  if not replied then perform apply_score(me, -10, 'ghost', null); end if;
  return json_build_object('ghost', not replied);
end $$;

create or replace function public.block_user(p_target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  insert into blocks (blocker_id, blocked_id) values (me, p_target) on conflict do nothing;
  delete from matches where user_a = least(me, p_target) and user_b = greatest(me, p_target);
end $$;

-- Permanently delete your account and everything tied to it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- Invites ---------------------------------------------------------------

-- Enter a friend's code (first week only). You get 1 bonus Super Like; they get
-- credit as soon as your profile is finished.
create or replace function public.redeem_invite(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare me profiles; inv profiles;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'Not signed in'; end if;
  if me.referred_by is not null then return json_build_object('ok', false, 'error', 'You already used an invite code.'); end if;
  if me.created_at < now() - interval '7 days' then
    return json_build_object('ok', false, 'error', 'Invite codes only work in your first week.');
  end if;
  select * into inv from profiles where invite_code = upper(trim(p_code));
  if inv.id is null then return json_build_object('ok', false, 'error', 'That code doesn’t exist. Check the spelling.'); end if;
  if inv.id = me.id then return json_build_object('ok', false, 'error', 'That’s your own code.'); end if;
  update profiles set referred_by = inv.id, bonus_supers = bonus_supers + 1 where id = me.id;
  if me.onboarded then
    update profiles set referral_credited = true, boost_until = greatest(coalesce(boost_until, now()), now()) + interval '24 hours' where id = me.id;
    perform credit_invite(inv.id);
    perform send_push(inv.id, coalesce(me.name, 'Your friend') || ' used your code 🎉', 'You earned 2 Super Likes. Make them your duo for double dates?', '/duos');
  end if;
  return json_build_object('ok', true, 'name', inv.name);
end $$;

-- Hoodie claim for Swirl Founders (10 friends).
create or replace function public.claim_reward(p_reward text, p_size text, p_contact text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_reward <> 'hoodie' then raise exception 'Unknown reward'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and 'founder' = any(badges)) then
    raise exception 'Invite 10 friends to unlock this';
  end if;
  insert into reward_claims (user_id, reward, size, contact) values (auth.uid(), p_reward, p_size, left(p_contact, 200))
    on conflict (user_id, reward) do update set size = excluded.size, contact = excluded.contact;
end $$;

-- "Likes you" is unlocked by inviting 3 friends, during events, or for admins.
create or replace function public.likes_unlocked(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select invites >= 3 from profiles where id = p_user), false)
      or exists (select 1 from events where now() >= starts_at and now() < ends_at)
      or exists (select 1 from admins where user_id = p_user)
$$;

-- People who liked you that you haven't answered yet (empty while locked).
create or replace function public.get_likes_me()
returns table (id uuid, name text, age int, photo text, tier text, kind text, item text, comment text, liked_at timestamptz, verified boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, date_part('year', age(p.birthday))::int, p.photos[1],
         case when p.visibility = 'hidden' then null else tier_for(coalesce(s.score, 1000)) end,
         x.kind, x.item, x.comment, x.created_at, p.verified
  from swipes x join profiles p on p.id = x.swiper_id left join scores s on s.user_id = p.id
  where x.target_id = auth.uid() and x.kind in ('like','super') and likes_unlocked(auth.uid())
    and p.onboarded and not p.banned and not is_blocked(auth.uid(), p.id)
    and not exists (select 1 from swipes y where y.swiper_id = auth.uid() and y.target_id = p.id)
  order by (x.kind = 'super') desc, x.created_at desc
$$;

-- Photo verification: the app uploads a selfie copying a pose; an admin compares it with the profile photos.
create or replace function public.submit_verification(p_path text, p_pose text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Bad upload'; end if;
  update profiles set verification_status = 'pending', verification_photo = p_path, verification_pose = p_pose
   where id = auth.uid() and not verified;
  perform notify_admins('New verification selfie', 'Someone is waiting for a blue check.', '/admin');
end $$;

-- Your week on Swirl (shown on the Profile tab every week).
create or replace function public.get_weekly_recap() returns json
language sql stable security definer set search_path = public as $$
  with me as (select id from profiles where id = auth.uid()),
  wk as (select coalesce(sum(delta) filter (where reason <> 'season'), 0) as pts,
                count(*) filter (where reason in ('like','super')) as likes,
                count(*) filter (where reason = 'super') as supers,
                count(*) filter (where reason = 'convo') as convos,
                count(*) filter (where reason = 'date') as dates
         from score_events where user_id = auth.uid() and created_at >= now() - interval '7 days'),
  board as (
    select p.id, coalesce(s.score, 1000) as score,
           coalesce(s.score, 1000) - coalesce((select sum(delta) from score_events e where e.user_id = p.id and e.reason <> 'season'
                                                 and e.created_at >= greatest(now() - interval '7 days', season_start())), 0) as score_then
    from profiles p left join scores s on s.user_id = p.id where p.onboarded and not p.banned
  )
  select json_build_object(
    'points', wk.pts, 'likes', wk.likes, 'supers', wk.supers, 'convos', wk.convos, 'dates', wk.dates,
    'matches', (select count(*) from matches m where auth.uid() in (m.user_a, m.user_b) and m.created_at >= now() - interval '7 days'),
    'rank_now', (select count(*) + 1 from board b where b.score > (select score from board where id = auth.uid())),
    'rank_then', (select count(*) + 1 from board b where b.score_then > (select score_then from board where id = auth.uid())),
    'total', (select count(*) from board)
  ) from wk
$$;

-- Everything the app needs about "me" beyond the profile row.
create or replace function public.get_extras() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'is_admin', is_admin(),
    'invite_code', p.invite_code,
    'invites', p.invites,
    'used_code', p.referred_by is not null,
    'can_redeem', p.referred_by is null and p.created_at > now() - interval '7 days',
    'bonus_supers', p.bonus_supers,
    'free_super_left', greatest(0, 1 - (select count(*) from swipes where swiper_id = p.id and kind = 'super'
                                                           and created_at >= day_start(local_date())))::int,
    'boost_until', case when p.boost_until > now() then p.boost_until end,
    'badges', p.badges,
    'banned', p.banned,
    'hoodie_claimed', exists (select 1 from reward_claims where user_id = p.id and reward = 'hoodie'),
    'verified', p.verified,
    'verification_status', p.verification_status,
    'likes_count', (select count(*) from swipes x where x.target_id = p.id and x.kind in ('like','super')
                      and not exists (select 1 from swipes y where y.swiper_id = p.id and y.target_id = x.swiper_id)
                      and exists (select 1 from profiles q where q.id = x.swiper_id and q.onboarded and not q.banned)
                      and not is_blocked(p.id, x.swiper_id))::int,
    'likes_unlocked', likes_unlocked(p.id),
    'duo_requests', (select count(*) from duos d where p.id in (d.user_a, d.user_b) and d.status = 'pending' and d.invited_by <> p.id)
                  + (select count(*) from duos d join duo_votes v on v.from_duo = d.id and v.vote = 'like' and v.user_id <> p.id
                     where d.status = 'active' and p.id in (d.user_a, d.user_b)
                       and not exists (select 1 from duo_votes w where w.from_duo = d.id and w.to_duo = v.to_duo and w.user_id = p.id)),
    'active_duos', (select count(*) from duos d where p.id in (d.user_a, d.user_b) and d.status = 'active'),
    'unread_chats', (select count(*) from matches m
                     where p.id in (m.user_a, m.user_b)
                       and exists (select 1 from messages x where x.match_id = m.id and x.sender_id <> p.id
                                     and x.created_at > coalesce(case when m.user_a = p.id then m.a_read_at else m.b_read_at end, '-infinity')))::int,
    'event', (select json_build_object('name', e.name, 'description', e.description, 'multiplier', e.multiplier, 'ends_at', e.ends_at)
              from events e where now() >= e.starts_at and now() < e.ends_at order by e.multiplier desc limit 1),
    'next_event', (select json_build_object('name', e.name, 'description', e.description, 'multiplier', e.multiplier, 'starts_at', e.starts_at)
                   from events e where e.starts_at > now() order by e.starts_at limit 1),
    'season', (select json_build_object('name', name, 'started_at', started_at) from seasons where ended_at is null order by id desc limit 1),
    'last_season', (select json_build_object('id', s.id, 'name', s.name, 'rank', r.rank, 'total', r.total, 'score', r.score, 'tier', r.tier)
                    from season_results r join seasons s on s.id = r.season_id
                    where r.user_id = p.id order by s.id desc limit 1)
  )
  from profiles p where p.id = auth.uid()
$$;

-- ---------- Leaderboard ----------------------------------------------------------

-- p_mode: 'campus' (season score) or 'week' (score gained in the last 7 days).
-- Returns the top 25 plus you. total = how many people are ranked (for "Top X%").
-- Hidden people are left out (except you). Tier-only people get value = null.
-- move = rank yesterday minus rank now (positive = climbed).
drop function if exists public.get_leaderboard(text, int);
create function public.get_leaderboard(p_mode text default 'campus', p_grad int default null)
returns table (rank int, user_id uuid, name text, photo text, grad_year int, tier text, value int,
               move int, is_me boolean, visibility text, total int, badges text[])
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id, p.name, p.photos[1] as photo, p.grad_year, p.visibility, p.badges,
           coalesce(s.score, 1000) as score,
           coalesce((select sum(delta) from score_events e where e.user_id = p.id and e.reason <> 'season'
                       and e.created_at >= greatest(day_start(local_date()), season_start())), 0) as today,
           coalesce((select sum(delta) from score_events e where e.user_id = p.id and e.reason <> 'season'
                       and e.created_at >= now() - interval '7 days'), 0) as week
    from profiles p left join scores s on s.user_id = p.id
    where p.onboarded and not p.banned
      and (p.id = auth.uid() or (p.visibility <> 'hidden' and not p.paused and not is_blocked(auth.uid(), p.id)))
      and (p_grad is null or p.grad_year = p_grad)
  ),
  ranked as (
    select b.*,
      (case when p_mode = 'week' then b.week else b.score end)::int as v,
      rank() over (order by case when p_mode = 'week' then b.week else b.score end desc, b.name) as r_now,
      rank() over (order by case when p_mode = 'week' then b.week - b.today else b.score - b.today end desc, b.name) as r_prev,
      -- if everyone was tied yesterday (launch day, new season) movement is meaningless
      (max(case when p_mode = 'week' then b.week - b.today else b.score - b.today end) over ()
        = min(case when p_mode = 'week' then b.week - b.today else b.score - b.today end) over ()) as flat,
      count(*) over () as n
    from base b
  )
  select r_now::int, id, name, photo, grad_year, tier_for(score),
         case when visibility = 'public' or id = auth.uid() then v else null end,
         (case when flat then 0 else r_prev - r_now end)::int, id = auth.uid(), visibility, n::int, badges
  from ranked
  where r_now <= 25 or id = auth.uid()
  order by r_now
$$;

-- Team boards (dorms and Greek chapters). Anti-cheat:
--   points that came from your own teammates don't count, and a team needs 5+ members.
-- Greek scores weight likes at half, so conversations and dates matter most.
create or replace function public.team_points(p_user uuid, p_kind text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(round(sum(case when p_kind = 'greek' and e.reason in ('like','super','pass') then e.delta * 0.5 else e.delta end)), 0)::int
  from score_events e
  join profiles me on me.id = p_user
  left join profiles src on src.id = e.source_user_id
  where e.user_id = p_user and e.reason <> 'season' and e.created_at >= now() - interval '7 days'
    and not coalesce(case when p_kind = 'dorm' then src.dorm = me.dorm else src.greek = me.greek end, false)
$$;

-- Same as team_points, but over a whole season instead of the last 7 days.
create or replace function public.team_points_between(p_user uuid, p_kind text, p_from timestamptz, p_to timestamptz) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(round(sum(case when p_kind = 'greek' and e.reason in ('like','super','pass') then e.delta * 0.5 else e.delta end)), 0)::int
  from score_events e
  join profiles me on me.id = p_user
  left join profiles src on src.id = e.source_user_id
  where e.user_id = p_user and e.reason <> 'season' and e.created_at >= p_from and e.created_at < p_to
    and not coalesce(case when p_kind = 'dorm' then src.dorm = me.dorm else src.greek = me.greek end, false)
$$;

-- Off-campus choices aren't dorms, so they don't compete on the Dorms board.
create or replace function public.is_real_dorm(p_dorm text) returns boolean
language sql immutable as $$
  select p_dorm is not null and p_dorm <> '' and p_dorm not in ('Off campus', 'The Hill (off campus)')
$$;

create or replace function public.get_dorm_board()
returns table (rank int, dorm text, members int, avg_week int, is_mine boolean)
language sql stable security definer set search_path = public as $$
  with people as (
    select p.dorm, team_points(p.id, 'dorm') as week
    from profiles p
    where p.onboarded and not p.banned and not p.paused and is_real_dorm(p.dorm)
      and not exists (select 1 from hidden_teams h where h.kind = 'dorm' and h.name = p.dorm)
  ),
  dorms as (
    select dorm, count(*)::int as members, round(avg(week))::int as avg_week from people group by dorm having count(*) >= 5
  )
  select (rank() over (order by avg_week desc, dorm))::int, dorm, members, avg_week,
         dorm = (select dorm from profiles where id = auth.uid())
  from dorms order by 1
$$;

create or replace function public.get_greek_board()
returns table (rank int, chapter text, members int, avg_week int, is_mine boolean)
language sql stable security definer set search_path = public as $$
  with people as (
    select p.greek, team_points(p.id, 'greek') as week
    from profiles p
    where p.onboarded and not p.banned and not p.paused and p.greek is not null and p.greek <> ''
      and not exists (select 1 from hidden_teams h where h.kind = 'greek' and h.name = p.greek)
  ),
  chapters as (
    select greek, count(*)::int as members, round(avg(week))::int as avg_week from people group by greek having count(*) >= 5
  )
  select (rank() over (order by avg_week desc, greek))::int, greek, members, avg_week,
         greek = (select greek from profiles where id = auth.uid())
  from chapters order by 1
$$;

-- My own score card for this season.
create or replace function public.get_my_score()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'score', coalesce((select score from scores where user_id = auth.uid()), 1000),
    'today', coalesce((select sum(delta) from score_events where user_id = auth.uid() and reason <> 'season'
                         and created_at >= greatest(day_start(local_date()), season_start())), 0),
    'week',  coalesce((select sum(delta) from score_events where user_id = auth.uid() and reason <> 'season'
                         and created_at >= now() - interval '7 days'), 0),
    'breakdown', coalesce((select json_object_agg(reason, json_build_object('count', c, 'points', p))
                           from (select reason, count(*) c, sum(delta) p from score_events
                                 where user_id = auth.uid() and reason not in ('season','reset')
                                   and created_at >= season_start()
                                 group by reason) t), '{}'::json),
    'history', coalesce((select json_agg(json_build_object('day', d, 'score', sc) order by d)
                         from (select d::date as d,
                                      1000 + coalesce((select sum(delta) from score_events
                                                       where user_id = auth.uid() and created_at < day_start(d::date + 1)), 0) as sc
                               from generate_series(local_date() - 13, local_date(), interval '1 day') d) h), '[]'::json)
  )
$$;

-- Matches list with the other person's card and last message.
drop function if exists public.get_matches();
create function public.get_matches()
returns table (match_id uuid, other_id uuid, name text, photo text, tier text, created_at timestamptz,
               last_body text, last_sender uuid, last_at timestamptz, date_mine boolean, date_paid boolean,
               unread int, verified boolean)
language sql stable security definer set search_path = public as $$
  select m.id, o.id, o.name, o.photos[1],
         case when o.visibility = 'hidden' then null else tier_for(coalesce(s.score, 1000)) end,
         m.created_at, lm.body, lm.sender_id, lm.created_at,
         case when m.user_a = auth.uid() then m.a_date else m.b_date end, m.date_paid,
         (select count(*)::int from messages x where x.match_id = m.id and x.sender_id <> auth.uid()
            and x.created_at > coalesce(case when m.user_a = auth.uid() then m.a_read_at else m.b_read_at end, '-infinity')),
         o.verified
  from matches m
  join profiles o on o.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join scores s on s.user_id = o.id
  left join lateral (select body, sender_id, created_at from messages where match_id = m.id order by created_at desc limit 1) lm on true
  where auth.uid() in (m.user_a, m.user_b) and not o.banned
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- Opening a chat marks it read (powers unread badges and "Seen").
create or replace function public.mark_read(p_match uuid) returns void
language sql security definer set search_path = public as $$
  update matches set a_read_at = case when user_a = auth.uid() then now() else a_read_at end,
                     b_read_at = case when user_b = auth.uid() then now() else b_read_at end
  where id = p_match and auth.uid() in (user_a, user_b)
$$;

-- The app reports crashes here so you can see them in the admin dashboard.
create or replace function public.log_error(p_message text, p_stack text, p_screen text, p_platform text, p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from app_errors where user_id = auth.uid() and created_at > now() - interval '1 day') >= 50 then return; end if;
  insert into app_errors (user_id, message, stack, screen, platform, app_version)
  values (auth.uid(), left(p_message, 1000), left(p_stack, 4000), left(p_screen, 200), left(p_platform, 20), left(p_version, 20));
end $$;

-- Help & support messages from the app. Admins get a push right away.
create or replace function public.send_feedback(p_body text, p_contact text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  p_body := trim(p_body);
  if coalesce(p_body, '') = '' then raise exception 'Write a message first'; end if;
  if (select count(*) from feedback where user_id = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You''ve sent a lot today. We''ll get back to you soon';
  end if;
  insert into feedback (user_id, body, contact) values (me, left(p_body, 2000), left(nullif(trim(p_contact), ''), 200));
  perform notify_admins('Support message', left(p_body, 100), '/admin');
end $$;

create or replace function public.admin_feedback(p_limit int default 100)
returns table (id bigint, created_at timestamptz, body text, contact text, status text, user_name text, user_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select f.id, f.created_at, f.body, f.contact, f.status, p.name, p.email
  from feedback f left join profiles p on p.id = f.user_id order by f.created_at desc limit p_limit;
end $$;

create or replace function public.admin_feedback_done(p_id bigint, p_done boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update feedback set status = case when p_done then 'done' else 'new' end where id = p_id;
end $$;

-- Tell admins right away about reports and verification requests.
create or replace function public.notify_admins(p_title text, p_body text, p_url text) returns void
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  for a in select user_id from admins loop perform send_push(a, p_title, p_body, p_url); end loop;
end $$;

create or replace function public.after_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_admins('New report', new.reason || coalesce(': ' || left(new.details, 80), ''), '/admin');
  return new;
end $$;

drop trigger if exists reports_after_insert on public.reports;
create trigger reports_after_insert after insert on public.reports
  for each row execute function public.after_report();

-- ---------- Admin (only people listed in the admins table) -------------------------
--
-- Make yourself an admin by running this once in the SQL Editor (use your app email):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@colorado.edu';

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare t date := local_date(); r json;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  select json_build_object(
    'users',      (select count(*) from profiles),
    'onboarded',  (select count(*) from profiles where onboarded),
    'banned',     (select count(*) from profiles where banned),
    'paused',     (select count(*) from profiles where paused),
    'gender',     (select coalesce(json_object_agg(g, c), '{}') from
                     (select coalesce(gender, 'unknown') g, count(*) c from profiles where onboarded group by 1) x),
    'by_class',   (select coalesce(json_object_agg(y, c), '{}') from
                     (select coalesce(grad_year::text, 'unknown') y, count(*) c from profiles where onboarded group by 1) x),
    'dorms',      (select coalesce(json_agg(json_build_object('dorm', d, 'count', c) order by c desc), '[]') from
                     (select dorm d, count(*) c from profiles where onboarded and dorm is not null group by 1 order by 2 desc limit 10) x),
    'dau',        (select count(*) from daily_active where day = t),
    'wau',        (select count(distinct user_id) from daily_active where day > t - 7),
    'mau',        (select count(distinct user_id) from daily_active where day > t - 30),
    'days',       (select json_agg(json_build_object(
                      'day', d,
                      'signups', (select count(*) from profiles where (created_at at time zone 'America/Denver')::date = d),
                      'active',  (select count(*) from daily_active where day = d)) order by d)
                   from (select g::date d from generate_series(t - 29, t, interval '1 day') g) x),
    'retention',  (select coalesce(json_object_agg(n, json_build_object('eligible', e, 'returned', rt)), '{}') from (
                     select n, count(*) e,
                            count(*) filter (where exists (select 1 from daily_active a where a.user_id = p.id
                                             and a.day >= (p.created_at at time zone 'America/Denver')::date + n)) rt
                     from (values (1), (7), (30)) v(n)
                     join profiles p on p.onboarded and (p.created_at at time zone 'America/Denver')::date <= t - n
                     group by n) x),
    'swipes',     (select json_build_object('like', count(*) filter (where kind = 'like'),
                                            'super', count(*) filter (where kind = 'super'),
                                            'pass', count(*) filter (where kind = 'pass'),
                                            'today', count(*) filter (where created_at >= day_start(t))) from swipes),
    'matches',    (select count(*) from matches),
    'matches_messaged', (select count(*) from matches m where exists (select 1 from messages where match_id = m.id)),
    'matches_both',     (select count(*) from matches m
                         where exists (select 1 from messages x where x.match_id = m.id and x.sender_id = m.user_a)
                           and exists (select 1 from messages y where y.match_id = m.id and y.sender_id = m.user_b)),
    'convos',     (select count(*) from matches where convo_paid),
    'dates',      (select count(*) from matches where date_paid),
    'messages',   (select count(*) from messages),
    'referred',   (select count(*) from profiles where referred_by is not null and onboarded),
    'top_inviters', (select coalesce(json_agg(json_build_object('name', name, 'email', email, 'invites', invites) order by invites desc), '[]')
                     from (select name, email, invites from profiles where invites > 0 order by invites desc limit 10) x),
    'reports_open', (select count(*) from reports where status = 'open'),
    'claims_open',  (select count(*) from reward_claims where status = 'new'),
    'verifications_pending', (select count(*) from profiles where verification_status = 'pending'),
    'verified',     (select count(*) from profiles where verified),
    'push_users',   (select count(distinct user_id) from push_tokens),
    'looking_for',  (select coalesce(json_object_agg(l, c), '{}') from
                       (select coalesce(looking_for, 'unknown') l, count(*) c from profiles where onboarded group by 1) x),
    'like_comments', (select count(*) from swipes where comment is not null),
    'errors_today', (select count(*) from app_errors where created_at >= day_start(t)),
    'feedback_new', (select count(*) from feedback where status = 'new'),
    'duos_active', (select count(*) from duos where status = 'active'),
    'duo_matches', (select count(*) from duo_matches),
    'duo_dates',   (select count(*) from duo_matches where date_paid),
    'season',     (select json_build_object('id', id, 'name', name, 'started_at', started_at) from seasons where ended_at is null order by id desc limit 1),
    'events',     (select coalesce(json_agg(json_build_object('id', id, 'name', name, 'description', description, 'multiplier', multiplier,
                                                              'starts_at', starts_at, 'ends_at', ends_at) order by starts_at), '[]')
                   from events where ends_at > now())
  ) into r;
  return r;
end $$;

create or replace function public.admin_users(p_search text default '', p_limit int default 100)
returns table (id uuid, email text, name text, gender text, grad_year int, dorm text, created_at timestamptz, onboarded boolean,
               score int, invites int, last_active_at timestamptz, banned boolean, reports int, photo text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select p.id, p.email, p.name, p.gender, p.grad_year, p.dorm, p.created_at, p.onboarded,
         coalesce(s.score, 1000), p.invites, p.last_active_at, p.banned,
         (select count(*)::int from reports r where r.target_id = p.id), p.photos[1]
  from profiles p left join scores s on s.user_id = p.id
  where coalesce(p_search, '') = '' or p.email ilike '%' || p_search || '%' or p.name ilike '%' || p_search || '%'
  order by p.created_at desc
  limit p_limit;
end $$;

create or replace function public.admin_reports(p_status text default 'open')
returns table (id bigint, created_at timestamptz, reason text, details text, status text,
               reporter_id uuid, reporter_name text, target_id uuid, target_name text, target_email text,
               target_photo text, target_reports int, target_banned boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select r.id, r.created_at, r.reason, r.details, r.status, r.reporter_id, rp.name, r.target_id, tp.name, tp.email,
         tp.photos[1], (select count(*)::int from reports x where x.target_id = r.target_id), tp.banned
  from reports r join profiles rp on rp.id = r.reporter_id join profiles tp on tp.id = r.target_id
  where p_status = 'all' or r.status = p_status
  order by r.created_at desc limit 200;
end $$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update profiles set banned = p_banned where id = p_user;
  if p_banned then
    update reports set status = 'actioned', resolved_at = now() where target_id = p_user and status = 'open';
  end if;
end $$;

create or replace function public.admin_resolve_report(p_id bigint, p_ban boolean) returns void
language plpgsql security definer set search_path = public as $$
declare tgt uuid;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update reports set status = case when p_ban then 'actioned' else 'dismissed' end, resolved_at = now()
   where id = p_id returning target_id into tgt;
  if p_ban and tgt is not null then perform admin_set_banned(tgt, true); end if;
end $$;

create or replace function public.admin_claims()
returns table (id bigint, created_at timestamptz, reward text, size text, contact text, status text,
               user_id uuid, name text, email text, invites int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select c.id, c.created_at, c.reward, c.size, c.contact, c.status, p.id, p.name, p.email, p.invites
  from reward_claims c join profiles p on p.id = c.user_id order by c.status = 'new' desc, c.created_at desc;
end $$;

create or replace function public.admin_update_claim(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update reward_claims set status = p_status where id = p_id;
end $$;

-- End the current season (saves everyone's final rank) and start a new one at 1,000.
-- Season-end badges. Runs when an admin starts a new season, before scores reset.
--   Leaderboard: #1, Top 10, Top 25 (only people who show on the leaderboard: not hidden or paused).
--   Teams: everyone in the winning dorm and the winning Greek chapter (5+ members, season-long average).
-- Badge ids look like 's1_top25' and stay on the profile for good.
create or replace function public.award_season(p_season int) returns void
language plpgsql security definer set search_path = public as $$
declare st timestamptz; r record; label text;
begin
  select started_at into st from seasons where id = p_season;
  if st is null or exists (select 1 from season_team_results where season_id = p_season) then return; end if;

  for r in
    select p.id, rank() over (order by coalesce(s.score, 1000) desc, p.created_at) as rk
    from profiles p left join scores s on s.user_id = p.id
    where p.onboarded and not p.banned and not p.paused and p.visibility <> 'hidden'
    order by 2
  loop
    exit when r.rk > 25;
    label := case when r.rk = 1 then 'top1' when r.rk <= 10 then 'top10' else 'top25' end;
    update profiles set badges = array_append(coalesce(badges, '{}'), 's' || p_season || '_' || label)
      where id = r.id and not ('s' || p_season || '_' || label = any(coalesce(badges, '{}')));
    perform send_push(r.id, 'Season over 🏆',
      case when r.rk = 1 then 'You finished #1 on the campus leaderboard!' else 'You finished in the ' || case when r.rk <= 10 then 'Top 10' else 'Top 25' end || ' this season. Your badge is on your profile.' end,
      '/profile');
  end loop;

  insert into season_team_results (season_id, kind, name, rank, members, avg_points)
  select p_season, kind, name, (rank() over (partition by kind order by avg_points desc, name))::int, members, avg_points
  from (
    select 'dorm' as kind, p.dorm as name, count(*)::int as members, round(avg(team_points_between(p.id, 'dorm', st, now())))::int as avg_points
    from profiles p
    where p.onboarded and not p.banned and is_real_dorm(p.dorm)
      and not exists (select 1 from hidden_teams h where h.kind = 'dorm' and h.name = p.dorm)
    group by p.dorm having count(*) >= 5
    union all
    select 'greek', p.greek, count(*)::int, round(avg(team_points_between(p.id, 'greek', st, now())))::int
    from profiles p
    where p.onboarded and not p.banned and p.greek is not null and p.greek <> ''
      and not exists (select 1 from hidden_teams h where h.kind = 'greek' and h.name = p.greek)
    group by p.greek having count(*) >= 5
  ) t;

  for r in
    select p.id, t.kind, t.name from season_team_results t
    join profiles p on (t.kind = 'dorm' and p.dorm = t.name) or (t.kind = 'greek' and p.greek = t.name)
    where t.season_id = p_season and t.rank = 1 and p.onboarded and not p.banned
  loop
    update profiles set badges = array_append(coalesce(badges, '{}'), 's' || p_season || '_' || r.kind)
      where id = r.id and not ('s' || p_season || '_' || r.kind = any(coalesce(badges, '{}')));
    perform send_push(r.id, 'Your team won 🏆', r.name || ' finished #1 this season. Champions badge unlocked.', '/leaderboard');
  end loop;
end $$;

-- Admin: last finished season's winners, so you know who gets the team prize.
create or replace function public.admin_season_winners()
returns table (season_id int, season_name text, kind text, name text, rank int, members int, avg_points int, prize_status text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select t.season_id, s.name, t.kind, t.name, t.rank, t.members, t.avg_points, t.prize_status
  from season_team_results t join seasons s on s.id = t.season_id
  where t.season_id = (select max(season_id) from season_team_results) and t.rank <= 3
  order by t.kind, t.rank;
end $$;

create or replace function public.admin_team_prize(p_season int, p_kind text, p_name text, p_sent boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update season_team_results set prize_status = case when p_sent then 'sent' else 'new' end
  where season_id = p_season and kind = p_kind and name = p_name;
end $$;

create or replace function public.admin_start_season(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare cur int;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Give the season a name'; end if;
  select id into cur from seasons where ended_at is null order by id desc limit 1;
  if cur is not null then
    insert into season_results (season_id, user_id, score, rank, total, tier)
    select cur, p.id, coalesce(s.score, 1000),
           rank() over (order by coalesce(s.score, 1000) desc), count(*) over (), tier_for(coalesce(s.score, 1000))
    from profiles p left join scores s on s.user_id = p.id
    where p.onboarded and not p.banned
    on conflict do nothing;
    perform award_season(cur);
    update seasons set ended_at = now() where id = cur;
  end if;
  insert into score_events (user_id, delta, reason) select user_id, 1000 - score, 'season' from scores where score <> 1000;
  update scores set score = 1000, updated_at = now();
  insert into seasons (name) values (trim(p_name));
end $$;

create or replace function public.admin_create_event(p_name text, p_description text, p_multiplier numeric,
                                                     p_starts timestamptz, p_ends timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  insert into events (name, description, multiplier, starts_at, ends_at) values (trim(p_name), p_description, p_multiplier, p_starts, p_ends);
end $$;

create or replace function public.admin_end_event(p_id int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update events set ends_at = now() where id = p_id and ends_at > now() and starts_at <= now();
  delete from events where id = p_id and starts_at > now();
end $$;

create or replace function public.admin_verifications()
returns table (user_id uuid, name text, email text, photos text[], selfie text, pose text, last_active_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select p.id, p.name, p.email, p.photos, p.verification_photo, p.verification_pose, p.last_active_at
  from profiles p where p.verification_status = 'pending' order by p.last_active_at desc nulls last;
end $$;

create or replace function public.admin_review_verification(p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update profiles set verified = p_approve, verification_status = case when p_approve then 'approved' else 'rejected' end
   where id = p_user;
  perform send_push(p_user, case when p_approve then 'You''re verified ✓' else 'Verification didn''t go through' end,
                    case when p_approve then 'Your profile now has a blue check.' else 'Try again with a clear selfie copying the pose.' end,
                    '/profile');
end $$;

-- Send a push notification to everyone (e.g. "Swirl Night starts now").
create or replace function public.admin_notify_all(p_title text, p_body text) returns int
language plpgsql security definer set search_path = public as $$
declare u uuid; n int := 0;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  for u in select distinct t.user_id from push_tokens t join profiles p on p.id = t.user_id where p.push_enabled and not p.banned loop
    perform send_push(u, p_title, p_body, '/discover');
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.admin_errors(p_limit int default 100)
returns table (id bigint, created_at timestamptz, message text, stack text, screen text, platform text, app_version text, user_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select e.id, e.created_at, e.message, e.stack, e.screen, e.platform, e.app_version, p.name
  from app_errors e left join profiles p on p.id = e.user_id order by e.created_at desc limit p_limit;
end $$;

create or replace function public.admin_teams()
returns table (kind text, name text, members int, hidden boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return query
  select t.kind, t.name, t.members::int, exists (select 1 from hidden_teams h where h.kind = t.kind and h.name = t.name)
  from (select 'dorm'::text kind, dorm name, count(*) members from profiles where onboarded and dorm is not null group by dorm
        union all
        select 'greek', greek, count(*) from profiles where onboarded and greek is not null group by greek) t
  order by t.kind, t.members desc;
end $$;

create or replace function public.admin_hide_team(p_kind text, p_name text, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if p_hidden then insert into hidden_teams values (p_kind, p_name) on conflict do nothing;
  else delete from hidden_teams where kind = p_kind and name = p_name; end if;
end $$;

-- ---------- Photos storage bucket --------------------------------------------

insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;

drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Private bucket for verification selfies: you can upload/see your own; admins can see all.
insert into storage.buckets (id, name, public) values ('verifications', 'verifications', false) on conflict (id) do nothing;

drop policy if exists "upload own selfie" on storage.objects;
create policy "upload own selfie" on storage.objects for insert to authenticated
  with check (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "read selfies" on storage.objects;
create policy "read selfies" on storage.objects for select to authenticated
  using (bucket_id = 'verifications' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- Realtime for chat --------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.duo_messages;
exception when duplicate_object then null; end $$;
-- Live "+8 · someone liked your photo" pop-ups. Each person only receives their own rows (row-level security).
alter table public.score_feed enable row level security;
drop policy if exists "read own score feed" on public.score_feed;
create policy "read own score feed" on public.score_feed for select to authenticated using (user_id = auth.uid());

create or replace function public.after_score_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare it text;
begin
  if new.delta <= 0 or new.reason not in ('like','super','reply','convo','date') then return new; end if;
  if new.reason in ('like','super') then
    select item into it from swipes where swiper_id = new.source_user_id and target_id = new.user_id;
  end if;
  insert into score_feed (user_id, delta, reason, item) values (new.user_id, new.delta, new.reason, it);
  delete from score_feed where user_id = new.user_id and created_at < now() - interval '7 days';
  return new;
end $$;
drop trigger if exists score_events_after_insert on public.score_events;
create trigger score_events_after_insert after insert on public.score_events
  for each row execute function public.after_score_event();

do $$ begin
  alter publication supabase_realtime add table public.score_feed;
exception when duplicate_object then null; end $$;

-- ---------- Permissions -----------------------------------------------------------

grant execute on function
  public.get_deck(int), public.confirm_date(uuid), public.unmatch(uuid),
  public.block_user(uuid), public.delete_my_account(), public.get_leaderboard(text, int), public.get_dorm_board(),
  public.get_my_score(), public.get_matches(), public.get_person(uuid), public.ping(), public.get_extras(),
  public.redeem_invite(text), public.claim_reward(text, text, text), public.is_admin(),
  public.admin_stats(), public.admin_users(text, int), public.admin_reports(text), public.admin_set_banned(uuid, boolean),
  public.admin_resolve_report(bigint, boolean), public.admin_claims(), public.admin_update_claim(bigint, text),
  public.admin_start_season(text), public.admin_create_event(text, text, numeric, timestamptz, timestamptz),
  public.admin_end_event(int),
  public.swipe(uuid, text, text, text), public.register_push(text), public.unregister_push(text),
  public.get_likes_me(), public.submit_verification(text, text), public.get_weekly_recap(), public.get_greek_board(),
  public.admin_verifications(), public.admin_review_verification(uuid, boolean), public.admin_notify_all(text, text),
  public.admin_teams(), public.admin_hide_team(text, text, boolean),
  public.mark_read(uuid), public.log_error(text, text, text, text, text), public.admin_errors(int),
  public.send_feedback(text, text), public.admin_feedback(int), public.admin_feedback_done(bigint, boolean),
  public.admin_season_winners(), public.admin_team_prize(int, text, text, boolean),
  public.get_my_duos(), public.get_duo_suggestions(), public.duo_invite(uuid, text), public.duo_respond(uuid, boolean),
  public.duo_leave(uuid), public.get_duo_deck(uuid, int), public.duo_vote(uuid, uuid, text), public.get_duo_pending(),
  public.get_duo_matches(), public.duo_confirm_date(uuid)
  to authenticated;
revoke execute on function public.award_season(int) from public, anon, authenticated;
revoke execute on function public.apply_score(uuid, int, text, uuid) from public, anon, authenticated;
revoke execute on function public.credit_invite(uuid) from public, anon, authenticated;
revoke execute on function public.send_push(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;
