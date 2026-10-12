-- =============================================================================
-- Swirl App Store reviewer account
-- Apple needs a working login to review the app. Reviewers can't receive your
-- email codes, so they sign in with a password instead
-- (sign-in screen → "Have a test account? Sign in with a password").
--
-- 1. Supabase → Authentication → Users → Add user → Create new user
--      Email:    appreview@demo.swirl.edu
--      Password: make one up (12+ characters) and save it somewhere
--      Tick "Auto Confirm User"
-- 2. Run sample_data.sql first, so the reviewer has people to see.
-- 3. Paste this file into SQL Editor → Run.
-- 4. In App Store Connect → your app → App Review Information → Sign-in required:
--      put the email and password from step 1.
--
-- Safe to run again. To remove later:
--   delete from auth.users where email = 'appreview@demo.swirl.edu';
-- =============================================================================

do $$
declare
  me uuid;
  other uuid;
  mid uuid;
begin
  select id into me from auth.users where email = 'appreview@demo.swirl.edu';
  if me is null then
    raise exception 'Create appreview@demo.swirl.edu first: Authentication → Users → Add user (tick Auto Confirm User)';
  end if;

  update public.profiles set
    name = 'Alex', birthday = '2004-06-15', gender = 'man', show_me = 'everyone', pronouns = 'he/him',
    major = 'Business', grad_year = 2027, looking_for = 'unsure', visibility = 'public', onboarded = true,
    terms_accepted_at = coalesce(terms_accepted_at, now()),
    photos = array[
      'https://picsum.photos/seed/swirl-review-1/800/1000',
      'https://picsum.photos/seed/swirl-review-2/800/1000',
      'https://picsum.photos/seed/swirl-review-3/800/1000'],
    captions = array['Flagstaff at sunrise', '', 'Folsom on game day'],
    photo_locations = array['Flagstaff Mountain', '', 'Folsom Field'],
    bio = 'Business major, weekend skier, always looking for the best breakfast burrito in Boulder.',
    prompts = jsonb_build_array(
      jsonb_build_object('q', 2, 'a', 'Coffee on Pearl, a walk at Chautauqua, then tacos'),
      jsonb_build_object('q', 4, 'a', 'Kind, curious, and down for a last-minute adventure'),
      jsonb_build_object('q', 3, 'a', 'I can name every lift at Eldora')),
    interests = array['Skiing', 'Hiking', 'Coffee', 'Football Saturdays', 'Live music'],
    classes = array['ECON 2010', 'BADM 1004'], spots = array['Norlin Library', 'Pearl Street'],
    dorm = 'Off campus', fav_spot = 'The Sink', fav_order = 'Sinkburger and fries'
  where id = me;

  -- Sample people who already liked the reviewer, so "Likes you" and matching can be tried.
  insert into public.swipes (swiper_id, target_id, kind, item, comment)
  select p.id, me, x.kind, x.item, x.comment
  from (values ('ava', 'super', 'prompt:0', 'ok this answer is elite'),
               ('maya', 'like', 'photo:0', 'where was this?'),
               ('sofia', 'like', null, null)) as x(handle, kind, item, comment)
  join public.profiles p on p.email = x.handle || '@sample.swirl.edu'
  on conflict do nothing;

  -- One existing match with a short conversation, so chat can be reviewed right away.
  select id into other from public.profiles where email = 'jules@sample.swirl.edu';
  if other is not null then
    insert into public.swipes (swiper_id, target_id, kind) values (other, me, 'like'), (me, other, 'like') on conflict do nothing;
    insert into public.matches (user_a, user_b) values (least(me, other), greatest(me, other)) on conflict (user_a, user_b) do nothing;
    select id into mid from public.matches where user_a = least(me, other) and user_b = greatest(me, other);
    if not exists (select 1 from public.messages where match_id = mid) then
      insert into public.messages (match_id, sender_id, body, created_at) values
        (mid, other, 'hey! is that Flagstaff in your first photo?', now() - interval '20 minutes'),
        (mid, me,    'yes! freezing but worth it', now() - interval '15 minutes'),
        (mid, other, 'ok we need to compare burrito rankings. coffee at Ozo this week?', now() - interval '10 minutes');
    end if;
  end if;
end $$;
