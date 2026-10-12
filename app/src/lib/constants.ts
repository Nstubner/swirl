export type Visibility = 'public' | 'tier' | 'hidden';
export type Gender = 'woman' | 'man' | 'nonbinary';
export type ShowMe = 'women' | 'men' | 'everyone';
export type Prompt = { q: number; a: string };

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  birthday: string | null;
  gender: Gender | null;
  show_me: ShowMe | null;
  pronouns: string | null;
  major: string | null;
  grad_year: number | null;
  bio: string | null;
  prompts: Prompt[];
  interests: string[];
  classes: string[];
  dorm: string | null;
  spots: string[];
  photos: string[];
  visibility: Visibility;
  paused: boolean;
  onboarded: boolean;
  created_at: string;
  invite_code: string | null;
  invites: number;
  bonus_supers: number;
  boost_until: string | null;
  badges: string[];
  banned: boolean;
  referred_by: string | null;
  captions: string[];
  looking_for: LookingFor | null;
  greek: string | null;
  filters: Filters;
  push_enabled: boolean;
  verified: boolean;
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
};

export type LookingFor = 'serious' | 'casual' | 'unsure' | 'friends';
export type Filters = { years?: string[]; looking?: LookingFor[]; verified_only?: boolean };

/** A card in Discover (from the get_deck function). Tier is null for Hidden users. */
export type DeckPerson = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  pronouns: string | null;
  major: string | null;
  grad_year: number | null;
  bio: string | null;
  prompts: Prompt[];
  interests: string[];
  classes: string[];
  dorm: string | null;
  spots: string[];
  photos: string[];
  tier: TierId | null;
  super_liked_me?: boolean;
  badges?: string[];
  captions?: string[];
  looking_for?: LookingFor | null;
  greek?: string | null;
  verified?: boolean;
  liked_me_item?: string | null;
  liked_me_comment?: string | null;
  i_swiped?: boolean;
  liked_me?: boolean;
};

export type TierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export const TIERS: { id: TierId; name: string; min: number; colors: [string, string] }[] = [
  { id: 'bronze', name: 'Bronze', min: 0, colors: ['#E7A877', '#A65F38'] },
  { id: 'silver', name: 'Silver', min: 900, colors: ['#F1F4F9', '#97A3B6'] },
  { id: 'gold', name: 'Gold', min: 1100, colors: ['#FFE38A', '#EFA415'] },
  { id: 'platinum', name: 'Platinum', min: 1300, colors: ['#B9FFF1', '#33BFB1'] },
  { id: 'diamond', name: 'Diamond', min: 1500, colors: ['#A9D6FF', '#C38BFF'] },
];
export const tierFor = (score: number) => [...TIERS].reverse().find((t) => score >= t.min) ?? TIERS[0];
export const tierById = (id: TierId) => TIERS.find((t) => t.id === id) ?? TIERS[0];
export const nextTier = (score: number) => TIERS.find((t) => t.min > score) ?? null;

export const GRAD_YEARS = [2027, 2028, 2029, 2030];
export const CLASS_NAME: Record<number, string> = { 2027: 'Senior', 2028: 'Junior', 2029: 'Sophomore', 2030: 'Freshman' };
export const PRONOUNS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they'];
export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'woman', label: 'Woman' },
  { id: 'man', label: 'Man' },
  { id: 'nonbinary', label: 'Nonbinary' },
];
export const SHOW_ME: { id: ShowMe; label: string }[] = [
  { id: 'women', label: 'Women' },
  { id: 'men', label: 'Men' },
  { id: 'everyone', label: 'Everyone' },
];
export const VISIBILITY: { id: Visibility; label: string; body: string }[] = [
  { id: 'public', label: 'Public', body: 'Your rank and Swirl Score show on the campus leaderboard.' },
  { id: 'tier', label: 'Tier only', body: 'You show on the leaderboard with your tier badge instead of your score.' },
  { id: 'hidden', label: 'Hidden', body: "You're off the leaderboard, and your tier badge stays private." },
];

export const MAJORS = [
  'Accounting', 'Advertising & PR', 'Aerospace Engineering', 'Applied Math', 'Art Practices', 'Astrophysics',
  'Business Analytics', 'Chemical Engineering', 'Cinema Studies', 'Civil Engineering', 'Computer Science',
  'Creative Technology & Design', 'Dance', 'Ecology & Evolutionary Biology', 'Economics', 'Electrical Engineering',
  'English', 'Environmental Design', 'Environmental Studies', 'Exploratory Studies', 'Finance', 'Geography',
  'Information Science', 'Integrative Physiology', 'International Affairs', 'Journalism', 'Linguistics', 'Management',
  'Marketing', 'Mechanical Engineering', 'Media Production', 'Molecular Biology', 'Music', 'Neuroscience',
  'Philosophy', 'Physics', 'Political Science', 'Psychology', 'Sociology', 'Spanish', 'Theatre', 'Other',
];

export const INTERESTS = [
  'Hiking', 'Skiing', 'Snowboarding', 'Climbing', 'Trail running', 'Running', 'Biking', 'Camping', 'Fishing',
  'Gym', 'Yoga', 'Soccer', 'Basketball', 'Football Saturdays', 'Spikeball', 'Golf', 'Coffee', 'Brunch', 'Cooking',
  'Baking', 'Live music', 'Concerts', 'Vinyl', 'EDM', 'Indie', 'Hip-hop', 'Country', 'Karaoke', 'Film',
  'Photography', 'Art', 'Fashion', 'Thrifting', 'Sneakers', 'Anime', 'Gaming', 'Chess', 'Trivia', 'Reading',
  'Poetry', 'Podcasts', 'Astronomy', 'Startups', 'Investing', 'Travel', 'Volunteering', 'Sustainability',
  'Plant parent', 'Dogs', 'Cats', 'Tarot',
];

export const COURSES = [
  'APPM 1350', 'APPM 2350', 'ASTR 1000', 'ATOC 1050', 'BCOR 1015', 'BCOR 1025', 'BCOR 2201', 'BCOR 2203',
  'BCOR 2204', 'CHEM 1113', 'CINE 1502', 'CSCI 1300', 'CSCI 2270', 'EBIO 1210', 'ECON 2010', 'ECON 2020',
  'ECON 3070', 'ENVS 1000', 'IPHY 3410', 'MATH 1300', 'MCDB 1150', 'PHIL 1000', 'PHYS 1110', 'PSYC 1001',
  'SOCY 1001', 'WRTG 1150',
];

export const DORMS = [
  'Andrews Hall', 'Arnett Hall', 'Baker Hall', 'Buckingham Hall', 'Cheyenne Arapaho Hall', 'Darley North',
  'Farrand Hall', 'Hallett Hall', 'Kittredge West', 'Libby Hall', 'Sewall Hall', 'Smith Hall', 'Stearns West',
  'Willard Hall', 'Williams Village North', 'The Hill (off campus)', 'Off campus',
];

export const CAMPUS_SPOTS = [
  'Norlin Library', 'Norlin Quad', 'UMC', 'Farrand Field', 'Folsom Field', 'Rec Center', 'C4C',
  'Koelbel courtyard', 'Engineering Center', 'Fiske Planetarium', 'Varsity Lake', 'Macky Auditorium',
  'The Hill', 'Pearl Street', 'Chautauqua',
];

export const PROMPT_QUESTIONS = [
  'My go-to campus spot is…', 'The way to win me over is…', 'A perfect Boulder Saturday looks like…',
  "I'm weirdly competitive about…", 'Green flags I look for…', 'My most controversial opinion…',
  "Let's debate this…", "The best concert I've been to…", "I'll pick the spot if you…", 'Typical Sunday…',
  'I geek out on…', 'Two truths and a lie…', 'Together we could…',
];

export const REPORT_REASONS = [
  'Fake profile or catfish', 'Inappropriate photos', 'Harassment or hate', 'Seems under 18',
  'Scam or spam', 'Made me feel unsafe', 'Something else',
];

export type DateSpot = { id: string; name: string; cat: 'coffee' | 'outdoors' | 'food' | 'nightlife'; area: string; tags: string[]; age21?: boolean };
export const DATE_SPOTS: DateSpot[] = [
  { id: 'buchanans', name: "Buchanan's Coffee Pub", cat: 'coffee', area: 'The Hill', tags: ['Coffee', 'Reading', 'Chess'] },
  { id: 'ozo', name: 'Ozo Coffee', cat: 'coffee', area: 'Pearl St', tags: ['Coffee', 'Brunch', 'Photography'] },
  { id: 'trident', name: 'Trident Booksellers & Cafe', cat: 'coffee', area: 'Pearl St', tags: ['Reading', 'Poetry', 'Coffee'] },
  { id: 'goat', name: 'Laughing Goat', cat: 'coffee', area: 'Pearl St', tags: ['Live music', 'Coffee', 'Indie'] },
  { id: 'chautauqua', name: 'Chautauqua Park', cat: 'outdoors', area: 'South Boulder', tags: ['Hiking', 'Trail running', 'Dogs'] },
  { id: 'flagstaff', name: 'Flagstaff Mountain', cat: 'outdoors', area: 'Flagstaff Rd', tags: ['Photography', 'Astronomy', 'Hiking'] },
  { id: 'creek', name: 'Boulder Creek Path', cat: 'outdoors', area: 'Downtown', tags: ['Running', 'Dogs', 'Biking'] },
  { id: 'farrand', name: 'Farrand Field', cat: 'outdoors', area: 'On campus', tags: ['Spikeball', 'Soccer', 'Football Saturdays'] },
  { id: 'sink', name: 'The Sink', cat: 'food', area: 'The Hill', tags: ['Football Saturdays', 'Cooking', 'Brunch'] },
  { id: 'petes', name: "Illegal Pete's", cat: 'food', area: 'The Hill', tags: ['Hip-hop', 'Live music', 'Cooking'] },
  { id: 'dushanbe', name: 'Boulder Dushanbe Teahouse', cat: 'food', area: 'Downtown', tags: ['Art', 'Travel', 'Brunch', 'Yoga'] },
  { id: 'cosmos', name: "Cosmo's Pizza", cat: 'food', area: 'The Hill', tags: ['Gaming', 'EDM', 'Anime'] },
  { id: 'fox', name: 'The Fox Theatre', cat: 'nightlife', area: 'The Hill', tags: ['Live music', 'Concerts', 'EDM', 'Indie'] },
  { id: 'fiske', name: 'Fiske Planetarium', cat: 'nightlife', area: 'On campus', tags: ['Astronomy', 'Vinyl', 'Film'] },
  { id: 'darkhorse', name: 'Dark Horse', cat: 'nightlife', area: 'Baseline Rd', tags: ['Trivia', 'Chess', 'Karaoke'], age21: true },
];

/** Three date spots in different categories, weighted toward shared interests, stable per match. */
export function pickDateIdeas(mine: string[], theirs: string[], seed: string, under21: boolean): DateSpot[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507)) >>> 0) / 4294967296;
  const a = new Set(mine);
  const b = new Set(theirs);
  const scored = DATE_SPOTS.filter((s) => !(s.age21 && under21))
    .map((s) => ({ s, w: s.tags.reduce((n, t) => n + (a.has(t) && b.has(t) ? 3 : a.has(t) || b.has(t) ? 1 : 0), 0) + rnd() * 1.5 }))
    .sort((x, y) => y.w - x.w);
  const out: DateSpot[] = [];
  for (const { s } of scored) {
    if (out.length === 3) break;
    if (!out.some((o) => o.cat === s.cat)) out.push(s);
  }
  return out;
}

/** "Both in ECON 2010" style tags. */
export function overlapTags(me: Pick<Profile, 'classes' | 'dorm' | 'spots'> | null, them: Pick<DeckPerson, 'classes' | 'dorm' | 'spots'>) {
  if (!me) return [] as string[];
  const tags: string[] = [];
  them.classes?.forEach((c) => me.classes.includes(c) && tags.push(`Both in ${c}`));
  if (them.dorm && them.dorm === me.dorm && them.dorm !== 'Off campus') {
    tags.push(them.dorm === 'The Hill (off campus)' ? 'Both live on the Hill' : `Both in ${them.dorm}`);
  }
  them.spots?.forEach((s) => me.spots.includes(s) && tags.push(`Both love ${s}`));
  return tags;
}

export function ageFrom(birthday: string | null) {
  if (!birthday) return null;
  const [y, m, d] = birthday.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : '0');

/** Points (must match supabase/schema.sql). */
export const PTS = { like: 8, super: 20, pass: -2, reply: 10, convo: 5, date: 30, ghost: -10, convoMin: 5 } as const;

/** Invite milestones (must match credit_invite in supabase/schema.sql). */
export const INVITE_MILESTONES = [
  { at: 1, title: '+2 Super Likes per friend', body: 'Every friend who finishes their profile gives you 2 extra Super Likes.' },
  { at: 3, title: '24-hour Boost', body: 'Your profile shows up first in Discover for a full day.' },
  { at: 5, title: 'Founding Member badge', body: 'A badge on your profile showing you helped start Swirl at CU.' },
  { at: 10, title: 'Swirl Founder badge + free hoodie', body: 'The rarest badge on campus, plus a Swirl hoodie on us.' },
] as const;

export const BADGES: Record<string, { label: string; body: string }> = {
  founding: { label: 'Founding Member', body: 'Invited 5+ friends to Swirl in its first season.' },
  founder: { label: 'Swirl Founder', body: 'Invited 10+ friends. One of the people who built Swirl at CU.' },
};

/** Link included when people share their invite code. Set this to your TestFlight or App Store link once you have it. */
export const APP_LINK = '';

/** Data returned by get_extras(). */
export type Extras = {
  is_admin: boolean;
  invite_code: string;
  invites: number;
  used_code: boolean;
  can_redeem: boolean;
  bonus_supers: number;
  free_super_left: number;
  boost_until: string | null;
  badges: string[];
  banned: boolean;
  hoodie_claimed: boolean;
  verified: boolean;
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
  likes_count: number;
  likes_unlocked: boolean;
  event: { name: string; description: string | null; multiplier: number; ends_at: string } | null;
  next_event: { name: string; description: string | null; multiplier: number; starts_at: string } | null;
  season: { name: string; started_at: string } | null;
  last_season: { id: number; name: string; rank: number; total: number; score: number; tier: TierId } | null;
};

/** "Top 12%" style label. */
export const topPct = (rank: number, total: number) => `Top ${Math.max(1, Math.ceil((rank / Math.max(1, total)) * 100))}%`;

export const LOOKING_FOR: { id: LookingFor; label: string; emoji: string }[] = [
  { id: 'serious', label: 'Something serious', emoji: '💞' },
  { id: 'casual', label: 'Something casual', emoji: '😎' },
  { id: 'unsure', label: 'Not sure yet', emoji: '🤷' },
  { id: 'friends', label: 'New friends', emoji: '👋' },
];
export const lookingLabel = (id?: string | null) => LOOKING_FOR.find((l) => l.id === id);

/**
 * Greek chapters people can pick. These are national organizations; trim this list to the
 * chapters that actually exist at CU Boulder before launch.
 */
export const GREEK_ORGS = [
  // Sororities
  'Alpha Chi Omega', 'Alpha Delta Pi', 'Alpha Epsilon Phi', 'Alpha Gamma Delta', 'Alpha Omicron Pi', 'Alpha Phi',
  'Alpha Xi Delta', 'Chi Omega', 'Delta Delta Delta', 'Delta Gamma', 'Delta Zeta', 'Gamma Phi Beta', 'Kappa Alpha Theta',
  'Kappa Delta', 'Kappa Kappa Gamma', 'Phi Mu', 'Pi Beta Phi', 'Sigma Kappa', 'Zeta Tau Alpha',
  // Fraternities
  'Alpha Epsilon Pi', 'Alpha Tau Omega', 'Beta Theta Pi', 'Chi Psi', 'Delta Chi', 'Delta Tau Delta', 'Delta Upsilon',
  'Kappa Sigma', 'Lambda Chi Alpha', 'Phi Delta Theta', 'Phi Gamma Delta (FIJI)', 'Phi Kappa Psi', 'Pi Kappa Alpha',
  'Sigma Alpha Epsilon', 'Sigma Chi', 'Sigma Nu', 'Sigma Phi Epsilon', 'Tau Kappa Epsilon', 'Theta Chi', 'Zeta Beta Tau',
  // Other
  'Multicultural Greek org', 'Professional / service fraternity',
];

export const ICEBREAKERS = [
  'Two truths and a lie, go.',
  'Best late-night food on the Hill?',
  'Would you rather: Flagstaff sunrise hike or Pearl St brunch?',
  'What’s the most overrated spot on campus?',
  'What’s your go-to karaoke song?',
  'Rank: Folsom game days, Fox Theatre shows, Chautauqua hikes.',
  'What’s a class you’d actually recommend?',
  'Worst roommate story, under 20 words.',
  'What would your friends say is your most annoying habit?',
  'If you could teleport anywhere for the weekend, where?',
  'What song have you had on repeat this week?',
  'Hot take you’d defend to the end?',
];

export const VERIFY_POSES = ['a peace sign ✌️', 'a thumbs up 👍', 'your hand on your head', 'pointing at the camera ☝️', 'a wave 👋'];
