-- =============================================================================
-- Swirl sample profiles (for testing only)
-- Paste into Supabase → SQL Editor → Run, AFTER schema.sql.
-- Creates 12 fake CU students so you can see full profiles, the leaderboard and
-- the dorm/Greek boards. Four of them have already liked every admin (with
-- comments) so you can test "Likes you", liking back and matching.
-- They are not real accounts: they can't log in or message you back.
--
-- REMOVE THEM before real users join (one line):
--   delete from auth.users where email like '%@sample.swirl.edu';
-- =============================================================================

do $$
declare
  r record;
  uid uuid;
begin
  for r in select * from (values
    -- email, name, birthday, gender, show_me, major, year, dorm, greek, looking, score, verified
    ('ava',    'Ava',    '2005-03-14'::date, 'woman', 'men',      'Psychology',           2028, 'Libby Hall',            'Kappa Kappa Gamma', 'serious', 1180, true),
    ('maya',   'Maya',   '2004-11-02'::date, 'woman', 'men',      'Marketing',            2027, 'The Hill (off campus)', 'Delta Gamma',       'unsure',  1240, true),
    ('jules',  'Jules',  '2006-01-20'::date, 'woman', 'everyone', 'Environmental Studies',2029, 'Farrand Hall',          null,                'casual',  1065, false),
    ('sofia',  'Sofia',  '2005-07-08'::date, 'woman', 'men',      'Integrative Physiology',2028,'Libby Hall',            'Alpha Phi',         'serious', 990,  true),
    ('emma',   'Emma',   '2006-04-30'::date, 'woman', 'men',      'Finance',              2029, 'Williams Village North', null,               'unsure',  1110, false),
    ('lily',   'Lily',   '2004-09-17'::date, 'woman', 'men',      'Journalism',           2027, 'Off campus',            'Pi Beta Phi',       'casual',  1320, true),
    ('nora',   'Nora',   '2005-12-05'::date, 'woman', 'everyone', 'Computer Science',     2028, 'Hallett Hall',          null,                'friends', 1005, false),
    ('chloe',  'Chloe',  '2006-02-11'::date, 'woman', 'men',      'Advertising & PR',     2029, 'Libby Hall',            'Gamma Phi Beta',    'serious', 1150, true),
    ('jake',   'Jake',   '2005-05-22'::date, 'man',   'women',    'Mechanical Engineering',2028,'Farrand Hall',          'Sigma Chi',         'unsure',  1090, true),
    ('marcus', 'Marcus', '2004-08-09'::date, 'man',   'women',    'Economics',            2027, 'The Hill (off campus)', 'Phi Delta Theta',   'casual',  1210, false),
    ('leo',    'Leo',    '2006-06-03'::date, 'man',   'everyone', 'Music',                2029, 'Hallett Hall',          null,                'serious', 980,  false),
    ('sam',    'Sam',    '2005-10-27'::date, 'man',   'women',    'Aerospace Engineering',2028, 'Williams Village North', 'Beta Theta Pi',    'unsure',  1035, true)
  ) as t(handle, name, bday, gender, show_me, major, grad, dorm, greek, looking, score, verified)
  loop
    select id into uid from auth.users where email = r.handle || '@sample.swirl.edu';
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (id, email) values (uid, r.handle || '@sample.swirl.edu');
    end if;
    update public.profiles set
      name = r.name, birthday = r.bday, gender = r.gender, show_me = r.show_me, major = r.major, grad_year = r.grad,
      dorm = r.dorm, greek = r.greek, looking_for = r.looking, visibility = 'public', onboarded = true,
      verified = r.verified, verification_status = case when r.verified then 'approved' else 'none' end,
      photos = array[
        'https://picsum.photos/seed/swirl-' || r.handle || '-1/800/1000',
        'https://picsum.photos/seed/swirl-' || r.handle || '-2/800/1000',
        'https://picsum.photos/seed/swirl-' || r.handle || '-3/800/1000'],
      captions = array['Sunday hike', '', 'Pearl St after finals'],
      photo_locations = array['Chautauqua', '', 'Pearl Street'],
      bio = case r.handle
        when 'ava' then 'Psych major who will absolutely analyze your music taste. Looking for someone to hike Flagstaff with before 8am.'
        when 'maya' then 'Senior, marketing, mildly obsessed with finding the best breakfast burrito in Boulder. Taking applications.'
        when 'jules' then 'Climbing, thrifting, and pretending I understand my ENVS readings.'
        when 'sofia' then 'Pre-PT. Runs on iced lattes. Will out-hike you and then make you brunch.'
        when 'emma' then 'Finance major by day, karaoke menace by night.'
        when 'lily' then 'I write for fun and for credit. Looking for someone who likes long walks and longer conversations.'
        when 'nora' then 'CS major. I will beat you at chess and then teach you how.'
        when 'chloe' then 'Freshman figuring out Boulder one coffee shop at a time.'
        when 'jake' then 'Engineer who skis more than he studies. Looking for a lift buddy.'
        when 'marcus' then 'Econ senior, Buffs football diehard, makes a mean pancake.'
        when 'leo' then 'Music major. I will make you a playlist within a week.'
        else 'Aerospace kid, amateur astronomer, professional Spikeball loser.' end,
      prompts = jsonb_build_array(
        jsonb_build_object('q', 2, 'a', 'Sunrise at Chautauqua, burritos on the Hill, a show at the Fox'),
        jsonb_build_object('q', 4, 'a', 'Texts back, tips well, knows a good trail'),
        jsonb_build_object('q', 3, 'a', 'Spikeball. I will not elaborate.')),
      interests = array['Hiking', 'Coffee', 'Live music', 'Skiing', 'Brunch'],
      classes = array['ECON 2010', 'PSYC 1001'],
      spots = array['Norlin Library', 'Pearl Street'],
      fav_spot = 'The Sink', fav_order = 'Sinkburger and a shake'
    where id = uid;
    update public.scores set score = r.score where user_id = uid;
  end loop;

  -- Four of them like every admin, with comments, so "Likes you" and matching can be tested.
  insert into public.swipes (swiper_id, target_id, kind, item, comment)
  select p.id, a.user_id, x.kind, x.item, x.comment
  from (values ('ava', 'super', 'prompt:0', 'ok this answer is elite'),
               ('maya', 'like', 'photo:0', 'where was this?'),
               ('sofia', 'like', null, null),
               ('chloe', 'like', 'prompt:1', 'agree 100%')) as x(handle, kind, item, comment)
  join public.profiles p on p.email = x.handle || '@sample.swirl.edu'
  cross join public.admins a
  where p.id <> a.user_id
  on conflict do nothing;
end $$;
