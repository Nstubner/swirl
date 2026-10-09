-- =============================================================================
-- Swirl database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it drops and recreates Swirl's own functions and policies.
--
-- What it creates
--   profiles      one row per student (created automatically on sign-up)
--   scores        Swirl Score per student (starts at 1000)
--   score_events  append-only log of every score change (likes, passes, bonuses)
--   swipes        who swiped on whom
--   matches       two people who liked each other
--   messages      chat messages
--   blocks, reports
--   photos        storage bucket for profile pictures
--
-- Every write that touches a score goes through a server function (RPC), so the
-- app can never set its own score.
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
  reason         text not null check (reason in ('like','super','pass','reply','date','ghost','reset')),
  source_user_id uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists score_events_user_time on public.score_events (user_id, created_at desc);

create table if not exists public.swipes (
  swiper_id  uuid not null references public.profiles(id) on delete cascade,
  target_id  uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('like','super','pass')),
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index if not exists swipes_target on public.swipes (target_id);

create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  a_bonus     boolean not null default false,   -- +5 reply bonus already paid to user_a
  b_bonus     boolean not null default false,
  a_date      boolean not null default false,   -- user_a confirmed "we went on a date"
  b_date      boolean not null default false,
  date_paid   boolean not null default false,
  last_message_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);

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

-- ---------- Helpers ---------------------------------------------------------

create or replace function public.tier_for(s int) returns text
language sql immutable as $$
  select case when s >= 1500 then 'diamond' when s >= 1300 then 'platinum'
              when s >= 1100 then 'gold' when s >= 900 then 'silver' else 'bronze' end
$$;

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

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

-- ---------- Sign-up: .edu only, auto-create profile + score -----------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or new.email !~* '^[^@\s]+@([a-z0-9-]+\.)+edu$' then
    raise exception 'Swirl is only for students with a .edu email';
  end if;
  insert into profiles (id, email) values (new.id, lower(new.email)) on conflict do nothing;
  insert into scores (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 18+ check whenever a birthday is saved.
create or replace function public.check_profile() returns trigger
language plpgsql as $$
begin
  if new.birthday is not null and new.birthday > (current_date - interval '18 years') then
    raise exception 'Swirl is for students 18 and older';
  end if;
  new.email := old.email;   -- email can't be changed from the app
  return new;
end $$;

drop trigger if exists profiles_check on public.profiles;
create trigger profiles_check before update on public.profiles
  for each row execute function public.check_profile();

-- ---------- Row level security ----------------------------------------------

alter table public.profiles     enable row level security;
alter table public.scores       enable row level security;
alter table public.score_events enable row level security;
alter table public.swipes       enable row level security;
alter table public.matches      enable row level security;
alter table public.messages     enable row level security;
alter table public.blocks       enable row level security;
alter table public.reports      enable row level security;

drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or (onboarded and not is_blocked(auth.uid(), id)));

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
    and exists (select 1 from matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b)
                and not is_blocked(m.user_a, m.user_b))
  );

drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "unblock" on public.blocks;
create policy "unblock" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

drop policy if exists "file reports" on public.reports;
create policy "file reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- ---------- Discover deck ----------------------------------------------------

-- Returns people you haven't swiped on, who you'd see and who'd see you.
-- Exposes tier (never the exact score) and hides the tier for Hidden users.
create or replace function public.get_deck(p_limit int default 30)
returns table (id uuid, name text, age int, gender text, pronouns text, major text, grad_year int, bio text,
               prompts jsonb, interests text[], classes text[], dorm text, spots text[], photos text[],
               tier text, super_liked_me boolean)
language sql stable security definer set search_path = public as $$
  with me as (select * from profiles where id = auth.uid())
  select p.id, p.name, date_part('year', age(p.birthday))::int, p.gender, p.pronouns, p.major, p.grad_year, p.bio,
         p.prompts, p.interests, p.classes, p.dorm, p.spots, p.photos,
         case when p.visibility = 'hidden' then null else tier_for(coalesce(s.score, 1000)) end,
         exists (select 1 from swipes x where x.swiper_id = p.id and x.target_id = me.id and x.kind = 'super')
  from profiles p
  cross join me
  left join scores s on s.user_id = p.id
  where p.id <> me.id and p.onboarded and not p.paused and not me.paused
    and not exists (select 1 from swipes w where w.swiper_id = me.id and w.target_id = p.id)
    and not is_blocked(me.id, p.id)
    and (me.show_me = 'everyone' or (me.show_me = 'women' and p.gender = 'woman') or (me.show_me = 'men' and p.gender = 'man'))
    and (p.show_me = 'everyone' or (p.show_me = 'women' and me.gender = 'woman') or (p.show_me = 'men' and me.gender = 'man'))
  order by (exists (select 1 from swipes x where x.swiper_id = p.id and x.target_id = me.id and x.kind = 'super')) desc,
           p.created_at desc
  limit p_limit
$$;

-- One person's profile card (for chat headers and "view profile"). Tier only, never the exact score.
create or replace function public.get_person(p_id uuid)
returns table (id uuid, name text, age int, gender text, pronouns text, major text, grad_year int, bio text,
               prompts jsonb, interests text[], classes text[], dorm text, spots text[], photos text[], tier text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, date_part('year', age(p.birthday))::int, p.gender, p.pronouns, p.major, p.grad_year, p.bio,
         p.prompts, p.interests, p.classes, p.dorm, p.spots, p.photos,
         case when p.visibility = 'hidden' and p.id <> auth.uid() then null else tier_for(coalesce(s.score, 1000)) end
  from profiles p left join scores s on s.user_id = p.id
  where p.id = p_id and (p.id = auth.uid() or (p.onboarded and not is_blocked(auth.uid(), p.id)))
$$;

-- ---------- Swiping + scoring -------------------------------------------------

-- Like +10, Super Like +25, each weighted by swiper score / receiver score (clamped 0.5–2).
-- Pass is a flat −3. Floor 500. Creates a match when both people liked each other.
create or replace function public.swipe(p_target uuid, p_kind text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_score int; their_score int; base int; mult numeric; delta int;
  mutual boolean; mid uuid; a uuid; b uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_kind not in ('like','super','pass') then raise exception 'Bad swipe'; end if;
  if p_target = me or is_blocked(me, p_target) then raise exception 'Not allowed'; end if;

  insert into swipes (swiper_id, target_id, kind) values (me, p_target, p_kind)
    on conflict (swiper_id, target_id) do nothing;
  if not found then return json_build_object('matched', false, 'duplicate', true); end if;

  select coalesce((select score from scores where user_id = me), 1000) into my_score;
  select coalesce((select score from scores where user_id = p_target), 1000) into their_score;

  if p_kind = 'pass' then
    delta := -3;
  else
    base := case when p_kind = 'super' then 25 else 10 end;
    mult := least(2, greatest(0.5, my_score::numeric / greatest(1, their_score)));
    delta := round(base * mult);
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

-- +5 the first time you message a match within 24 hours of matching.
create or replace function public.on_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = new.match_id for update;
  update matches set last_message_at = new.created_at where id = m.id;
  if new.created_at - m.created_at <= interval '24 hours' then
    if new.sender_id = m.user_a and not m.a_bonus then
      update matches set a_bonus = true where id = m.id;
      perform apply_score(m.user_a, 5, 'reply', null);
    elsif new.sender_id = m.user_b and not m.b_bonus then
      update matches set b_bonus = true where id = m.id;
      perform apply_score(m.user_b, 5, 'reply', null);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message();

-- "We went on a date": +15 each once both people confirm.
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
    perform apply_score(m.user_a, 15, 'date', m.user_b);
    perform apply_score(m.user_b, 15, 'date', m.user_a);
    return json_build_object('both', true);
  end if;
  return json_build_object('both', false);
end $$;

-- Unmatch. −5 if you never sent a single message (ghosting).
create or replace function public.unmatch(p_match uuid) returns json
language plpgsql security definer set search_path = public as $$
declare m matches; me uuid := auth.uid(); replied boolean;
begin
  select * into m from matches where id = p_match and me in (user_a, user_b);
  if m.id is null then raise exception 'Match not found'; end if;
  select exists (select 1 from messages where match_id = m.id and sender_id = me) into replied;
  delete from matches where id = m.id;
  if not replied then perform apply_score(me, -5, 'ghost', null); end if;
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

-- ---------- Leaderboard ----------------------------------------------------------

-- p_mode: 'campus' (total score) or 'week' (score gained in the last 7 days).
-- Hidden people are left out (except you, flagged is_me). Tier-only people get value = null.
-- move = rank yesterday minus rank now (positive = climbed).
create or replace function public.get_leaderboard(p_mode text default 'campus', p_grad int default null)
returns table (rank int, user_id uuid, name text, photo text, grad_year int, tier text, value int,
               move int, is_me boolean, visibility text)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id, p.name, p.photos[1] as photo, p.grad_year, p.visibility,
           coalesce(s.score, 1000) as score,
           coalesce((select sum(delta) from score_events e where e.user_id = p.id and e.created_at >= current_date), 0) as today,
           coalesce((select sum(delta) from score_events e where e.user_id = p.id and e.created_at >= now() - interval '7 days'), 0) as week
    from profiles p left join scores s on s.user_id = p.id
    where p.onboarded
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
        = min(case when p_mode = 'week' then b.week - b.today else b.score - b.today end) over ()) as flat
    from base b
  )
  select r_now::int, id, name, photo, grad_year, tier_for(score),
         case when visibility = 'public' or id = auth.uid() then v else null end,
         (case when flat then 0 else r_prev - r_now end)::int, id = auth.uid(), visibility
  from ranked order by r_now
$$;

-- My own score card: score, tier, change since midnight, weekly gain, breakdown.
create or replace function public.get_my_score()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'score', coalesce((select score from scores where user_id = auth.uid()), 1000),
    'today', coalesce((select sum(delta) from score_events where user_id = auth.uid() and created_at >= current_date), 0),
    'week',  coalesce((select sum(delta) from score_events where user_id = auth.uid() and created_at >= now() - interval '7 days'), 0),
    'breakdown', coalesce((select json_object_agg(reason, json_build_object('count', c, 'points', p))
                           from (select reason, count(*) c, sum(delta) p from score_events
                                 where user_id = auth.uid() group by reason) t), '{}'::json),
    'history', coalesce((select json_agg(json_build_object('day', d, 'score', sc) order by d)
                         from (select d::date as d,
                                      1000 + coalesce((select sum(delta) from score_events
                                                       where user_id = auth.uid() and created_at < d + interval '1 day'), 0) as sc
                               from generate_series(current_date - 13, current_date, interval '1 day') d) h), '[]'::json)
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
  where auth.uid() in (m.user_a, m.user_b)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

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

grant execute on function public.get_deck(int), public.swipe(uuid, text), public.confirm_date(uuid),
  public.unmatch(uuid), public.block_user(uuid), public.delete_my_account(),
  public.get_leaderboard(text, int), public.get_my_score(), public.get_matches(), public.get_person(uuid) to authenticated;
revoke execute on function public.apply_score(uuid, int, text, uuid) from public, anon, authenticated;
