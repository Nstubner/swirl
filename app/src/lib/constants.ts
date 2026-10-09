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
};

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
