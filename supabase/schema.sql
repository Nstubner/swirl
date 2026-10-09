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
  end if;
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
    update profiles set referral_credited = true where id = new.id;
    perform credit_invite(new.referred_by);
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

drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or (onboarded and not banned and not is_blocked(auth.uid(), id)));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read own score" on public.scores;
create policy "read own score" on public.scores for select to authenticated using (user_id = auth.uid());

drop policy if exists "read own score events" on public.score_events;
create policy "read own score events" on public.score_events for select to authenticated using (user_id = auth.uid());

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

-- ---------- Discover deck ----------------------------------------------------

-- People you haven't swiped on, who you'd see and who'd see you.
-- Super Likes on you come first, then Boosted profiles, then newest.
drop function if exists public.get_deck(int);
create function public.get_deck(p_limit int default 30)
returns table (id uuid, name text, age int, gender text, pronouns text, major text, grad_year int, bio text,
               prompts jsonb, interests text[], classes text[], dorm text, spots text[], photos text[],
               tier text, super_liked_me boolean, badges text[])
language sql stable security definer set search_path = public as $$
  with me as (select * from profiles where id = auth.uid())
  select p.id, p.name, date_part('year', age(p.birthday))::int, p.gender, p.pronouns, p.major, p.grad_year, p.bio,
         p.prompts, p.interests, p.classes, p.dorm, p.spots, p.photos,
         case when p.visibility = 'hidden' then null else tier_for(coalesce(s.score, 1000)) end,
         exists (select 1 from swipes x where x.swiper_id = p.id and x.target_id = me.id and x.kind = 'super'),
         p.badges
  from profiles p
  cross join me
  left join scores s on s.user_id = p.id
  where p.id <> me.id and p.onboarded and not p.paused and not p.banned and not me.paused and not me.banned
    and not exists (select 1 from swipes w where w.swiper_id = me.id and w.target_id = p.id)
    and not is_blocked(me.id, p.id)
    and (me.show_me = 'everyone' or (me.show_me = 'women' and p.gender = 'woman') or (me.show_me = 'men' and p.gender = 'man'))
    and (p.show_me = 'everyone' or (p.show_me = 'women' and me.gender = 'woman') or (p.show_me = 'men' and me.gender = 'man'))
  order by (exists (select 1 from swipes x where x.swiper_id = p.id and x.target_id = me.id and x.kind = 'super')) desc,
           (coalesce(p.boost_until, '-infinity') > now()) desc,
           p.created_at desc
  limit p_limit
$$;

-- One person's profile (chat headers, "view profile", previewing your own).
drop function if exists public.get_person(uuid);
create function public.get_person(p_id uuid)
returns table (id uuid, name text, age int, gender text, pronouns text, major text, grad_year int, bio text,
               prompts jsonb, interests text[], classes text[], dorm text, spots text[], photos text[], tier text,
               badges text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.name, date_part('year', age(p.birthday))::int, p.gender, p.pronouns, p.major, p.grad_year, p.bio,
         p.prompts, p.interests, p.classes, p.dorm, p.spots, p.photos,
         case when p.visibility = 'hidden' and p.id <> auth.uid() then null else tier_for(coalesce(s.score, 1000)) end,
         p.badges
  from profiles p left join scores s on s.user_id = p.id
  where p.id = p_id and (p.id = auth.uid() or (p.onboarded and not p.banned and not is_blocked(auth.uid(), p.id)))
$$;

-- ---------- Swiping + scoring -------------------------------------------------
--
-- Like received +8, Super Like +20. Each is weighted by the liker's score vs yours
-- (0.5×–2×), halved if the liker likes almost everyone (more than 80% of their
-- last 30 swipes), and multiplied during events like Swirl Night.
-- Pass received −2. Floor 500.
-- Super Likes: 1 free per day (Boulder time) plus any you've earned from invites.

create or replace function public.swipe(p_target uuid, p_kind text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_score int; their_score int; base int; mult numeric; ev numeric; n_recent int; n_likes int; delta int;
  used int; mutual boolean; mid uuid; a uuid; b uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_kind not in ('like','super','pass') then raise exception 'Bad swipe'; end if;
  if p_target = me or is_blocked(me, p_target) then raise exception 'Not allowed'; end if;
  if exists (select 1 from profiles where id = me and banned) then raise exception 'Account suspended'; end if;
  if exists (select 1 from swipes where swiper_id = me and target_id = p_target) then
    return json_build_object('matched', false, 'duplicate', true);
  end if;

  if p_kind = 'super' then
    select count(*) into used from swipes where swiper_id = me and kind = 'super' and created_at >= day_start(local_date());
    if used >= 1 then
      update profiles set bonus_supers = bonus_supers - 1 where id = me and bonus_supers > 0;
      if not found then raise exception 'Out of Super Likes'; end if;
    end if;
  end if;

  insert into swipes (swiper_id, target_id, kind) values (me, p_target, p_kind)
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
      if mid is null then select id into mid from matches where user_a = a and user_b = b; end if;
      return json_build_object('matched', true, 'match_id', mid);
    end if;
  end if;
  return json_build_object('matched', false);
end $$;

-- Quick reply: +10 the first time you message a match within 24 hours of matching.
-- Real conversation: +5 each once you've both sent at least 5 messages.
create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare m matches; ca int; cb int;
begin
  select * into m from matches where id = new.match_id for update;
  update matches set last_message_at = new.created_at where id = m.id;
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
    update profiles set referral_credited = true where id = me.id;
    perform credit_invite(inv.id);
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

-- Dorm vs dorm: average points gained this week per member (dorms with 3+ people).
create or replace function public.get_dorm_board()
returns table (rank int, dorm text, members int, avg_week int, is_mine boolean)
language sql stable security definer set search_path = public as $$
  with people as (
    select p.dorm,
           coalesce((select sum(delta) from score_events e where e.user_id = p.id and e.reason <> 'season'
                       and e.created_at >= now() - interval '7 days'), 0) as week
    from profiles p
    where p.onboarded and not p.banned and not p.paused and p.dorm is not null and p.dorm <> ''
  ),
  dorms as (
    select dorm, count(*)::int as members, round(avg(week))::int as avg_week from people group by dorm having count(*) >= 3
  )
  select (rank() over (order by avg_week desc, dorm))::int, dorm, members, avg_week,
         dorm = (select dorm from profiles where id = auth.uid())
  from dorms order by 1
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
create or replace function public.get_matches()
returns table (match_id uuid, other_id uuid, name text, photo text, tier text, created_at timestamptz,
               last_body text, last_sender uuid, last_at timestamptz, date_mine boolean, date_paid boolean)
language sql stable security definer set search_path = public as $$
  select m.id, o.id, o.name, o.photos[1],
         case when o.visibility = 'hidden' then null else tier_for(coalesce(s.score, 1000)) end,
         m.created_at, lm.body, lm.sender_id, lm.created_at,
         case when m.user_a = auth.uid() then m.a_date else m.b_date end, m.date_paid
  from matches m
  join profiles o on o.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join scores s on s.user_id = o.id
  left join lateral (select body, sender_id, created_at from messages where match_id = m.id order by created_at desc limit 1) lm on true
  where auth.uid() in (m.user_a, m.user_b) and not o.banned
  order by coalesce(lm.created_at, m.created_at) desc
$$;

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

-- ---------- Photos storage bucket --------------------------------------------

insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;

drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Realtime for chat --------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;

-- ---------- Permissions -----------------------------------------------------------

grant execute on function
  public.get_deck(int), public.swipe(uuid, text), public.confirm_date(uuid), public.unmatch(uuid),
  public.block_user(uuid), public.delete_my_account(), public.get_leaderboard(text, int), public.get_dorm_board(),
  public.get_my_score(), public.get_matches(), public.get_person(uuid), public.ping(), public.get_extras(),
  public.redeem_invite(text), public.claim_reward(text, text, text), public.is_admin(),
  public.admin_stats(), public.admin_users(text, int), public.admin_reports(text), public.admin_set_banned(uuid, boolean),
  public.admin_resolve_report(bigint, boolean), public.admin_claims(), public.admin_update_claim(bigint, text),
  public.admin_start_season(text), public.admin_create_event(text, text, numeric, timestamptz, timestamptz),
  public.admin_end_event(int)
  to authenticated;
revoke execute on function public.apply_score(uuid, int, text, uuid) from public, anon, authenticated;
revoke execute on function public.credit_invite(uuid) from public, anon, authenticated;
