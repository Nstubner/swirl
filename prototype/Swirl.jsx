/* =============================================================================
   SWIRL — clickable prototype
   A college dating app with a live, like-based campus leaderboard.

   One self-contained React component:
     • Tailwind CSS utility classes for layout, spacing and type (core classes only)
     • A small embedded stylesheet for brand tokens (dark + light), fonts and keyframes
     • lucide-react for icons
     • No backend: in-memory state + realistic mock data, simulated in real time

   File map
     1. Imports
     2. Brand stylesheet
     3. Utilities
     4. Mock data
     5. Scoring & ranking logic
     6. Simulation helpers (incoming swipes, chat replies, date ideas)
     7. UI primitives
     8. Screens: splash & onboarding
     9. Screens: discover, profile detail, filters, group deck
    10. Screens: match moment, matches list, chat, report/confirm sheets
    11. Screens: leaderboard, campus rivalry, season recap
    12. Screens: my profile, edit profile, settings, safety center, group
    13. App shell: state, reducer, simulations, navigation, phone frame

   Prototype shortcuts (also in Settings → Prototype controls, and in the side
   panel on wide screens): Swirl Night live toggle, semester reset, offline mode,
   incoming-swipe speed, fast-forward two weeks, trigger a match.
   Keyboard on Discover: ← pass, → like, ↑ super like.
   ========================================================================== */

/* ============================== 1. IMPORTS ============================== */

import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle, ArrowDown, ArrowUp, Ban, Bell, BookOpen, CalendarHeart, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Clock, Coffee, Copy, Crown, Eye, EyeOff, Flag, Flame, GraduationCap,
  Heart, Home, Info, LifeBuoy, Loader2, Lock, LogOut, Mail, MapPin, MessageCircle, Minus, Moon,
  MoreVertical, Mountain, Music, Pause, Pencil, Phone, Play, Plus, RefreshCw, RotateCcw, Search, Send, Settings,
  Share2, Shield, ShieldCheck, SlidersHorizontal, Sparkles, Star, Sun, Trash2, TrendingUp, Trophy, Upload,
  User, UserPlus, Users, Utensils, WifiOff, X, Zap,
} from "lucide-react";

/* ========================== 2. BRAND STYLESHEET ========================== */
/* Theme tokens live on .sw-root[data-theme]. Tailwind handles layout; these
   classes handle brand color, type and motion so the file works anywhere
   Tailwind's core utilities are available (no arbitrary values needed). */

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Figtree:wght@400..800&display=swap');
.sw-root{--violet:#5B2EFF;--pink:#FF3D8B;--grad:linear-gradient(135deg,#5B2EFF 0%,#FF3D8B 100%);
  --card:#FFFFFF;--card-text:#15101F;--card-muted:#6E6684;--card-line:rgba(21,16,31,.08);
  font-family:'Figtree',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
.sw-root[data-theme=dark]{--page:#07050C;--bg:#0E0B16;--surface:#171224;--surface-2:#221A33;--line:rgba(237,230,255,.09);
  --text:#F7F4FF;--muted:#ABA2C0;--faint:#776E8C;--up:#25D094;--down:#FF5C73;--glass:rgba(14,11,22,.55);
  --shadow:0 24px 48px -24px rgba(0,0,0,.9);--soft:rgba(91,46,255,.16);color-scheme:dark}
.sw-root[data-theme=light]{--page:#E7E1F5;--bg:#F5F2FC;--surface:#FFFFFF;--surface-2:#EEE9F8;--line:rgba(21,16,31,.09);
  --text:#15101F;--muted:#625A78;--faint:#968EAA;--up:#0B9463;--down:#DB3550;--glass:rgba(14,11,22,.45);
  --shadow:0 24px 44px -26px rgba(64,32,140,.45);--soft:rgba(91,46,255,.10);color-scheme:light}
.sw-page{background:var(--page)}
.sw-app{background:var(--bg);color:var(--text)}
.sw-surface{background:var(--surface)}
.sw-surface-2{background:var(--surface-2)}
.sw-soft{background:var(--soft)}
.sw-border{border-color:var(--line)}
.sw-text{color:var(--text)}
.sw-muted{color:var(--muted)}
.sw-faint{color:var(--faint)}
.sw-up{color:var(--up)}
.sw-down{color:var(--down)}
.sw-card{background:var(--card);color:var(--card-text);box-shadow:var(--shadow)}
.sw-card-muted{color:var(--card-muted)}
.sw-card-line{border-color:var(--card-line)}
.sw-grad{background:var(--grad);color:#fff}
.sw-grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.sw-grad-ring{border:2px solid transparent;background:linear-gradient(var(--bg),var(--bg)) padding-box,var(--grad) border-box}
.sw-grad-outline{border:1.5px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,var(--grad) border-box}
.sw-grad-outline-card{border:1.5px solid transparent;background:linear-gradient(#fff,#fff) padding-box,var(--grad) border-box}
.sw-glass{background:var(--glass);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff}
.sw-display{font-family:'Bricolage Grotesque','Figtree',ui-sans-serif,system-ui,sans-serif;letter-spacing:-.025em}
.sw-num{font-variant-numeric:tabular-nums}
.sw-balance{text-wrap:balance}
.sw-scroll{overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
.sw-scroll::-webkit-scrollbar,.sw-hscroll::-webkit-scrollbar{display:none}
.sw-hscroll{overflow-x:auto;scrollbar-width:none}
.sw-scroll>*,.sw-hscroll>*{flex-shrink:0}
.sw-root button{cursor:pointer;-webkit-user-select:none;user-select:none}
.sw-root button:disabled{cursor:not-allowed}
.sw-root :focus{outline:none}
.sw-root :focus-visible{outline:2px solid var(--pink);outline-offset:2px}
.sw-input{background:var(--surface-2);color:var(--text);border:1.5px solid transparent;transition:border-color .15s}
.sw-input::placeholder{color:var(--faint)}
.sw-input:focus{border-color:var(--violet)}
.sw-root .sw-input:focus-visible{outline:none}
.sw-input.sw-invalid{border-color:var(--down)}
.sw-input option{background:var(--surface);color:var(--text)}
.sw-range{accent-color:#FF3D8B;width:100%}
.sw-noselect{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.sw-skeleton{background:linear-gradient(90deg,var(--surface) 0%,var(--surface-2) 50%,var(--surface) 100%);background-size:200% 100%;animation:sw-shimmer 1.3s linear infinite}
@keyframes sw-spin{to{transform:rotate(360deg)}}
@keyframes sw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes sw-toast-in{from{transform:translateY(-14px) scale(.96);opacity:0}to{transform:none;opacity:1}}
@keyframes sw-sheet-in{from{transform:translateY(100%)}to{transform:none}}
@keyframes sw-fade-in{from{opacity:0}to{opacity:1}}
@keyframes sw-slide-in{from{transform:translateX(100%)}to{transform:none}}
@keyframes sw-rise{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
@keyframes sw-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.06);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes sw-shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}
@keyframes sw-bump{0%{transform:scale(1)}35%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes sw-float-up{0%{transform:translateY(4px);opacity:0}15%{opacity:1}100%{transform:translateY(-30px);opacity:0}}
@keyframes sw-typing{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-4px);opacity:1}}
@keyframes sw-pulse{0%{box-shadow:0 0 0 0 rgba(255,61,139,.65)}70%{box-shadow:0 0 0 9px rgba(255,61,139,0)}100%{box-shadow:0 0 0 0 rgba(255,61,139,0)}}
@keyframes sw-orbit-l{0%{transform:translate(-150px,90px) rotate(-220deg) scale(.3);opacity:0}60%{opacity:1}100%{transform:translate(0,0) rotate(-9deg) scale(1);opacity:1}}
@keyframes sw-orbit-r{0%{transform:translate(150px,-90px) rotate(220deg) scale(.3);opacity:0}60%{opacity:1}100%{transform:translate(0,0) rotate(9deg) scale(1);opacity:1}}
@keyframes sw-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes sw-confetti{0%{transform:translate3d(0,-20px,0) rotate(0);opacity:1}100%{transform:translate3d(var(--dx),860px,0) rotate(760deg);opacity:0}}
@keyframes sw-glow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes sw-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.sw-anim-toast{animation:sw-toast-in .28s cubic-bezier(.2,.9,.3,1.2) both}
.sw-anim-sheet{animation:sw-sheet-in .32s cubic-bezier(.2,.8,.2,1) both}
.sw-anim-fade{animation:sw-fade-in .2s ease both}
.sw-anim-slide{animation:sw-slide-in .28s cubic-bezier(.2,.8,.2,1) both}
.sw-anim-rise{animation:sw-rise .35s cubic-bezier(.2,.8,.2,1) both}
.sw-anim-pop{animation:sw-pop .55s cubic-bezier(.2,.9,.3,1.3) both}
.sw-anim-shake{animation:sw-shake .45s both}
.sw-anim-spin{animation:sw-spin 10s linear infinite}
.sw-anim-spin-fast{animation:sw-spin .9s linear infinite}
.sw-anim-bump{animation:sw-bump .45s ease}
.sw-anim-float{animation:sw-float-up 1.3s ease-out forwards}
.sw-anim-glow{animation:sw-glow 2.4s ease-in-out infinite}
.sw-live-dot{animation:sw-pulse 1.6s infinite}
.sw-typing-dot{animation:sw-typing 1.1s infinite}
.sw-orbit-l{animation:sw-orbit-l .95s cubic-bezier(.2,.8,.2,1) .1s both}
.sw-orbit-r{animation:sw-orbit-r .95s cubic-bezier(.2,.8,.2,1) .1s both}
.sw-draw{animation:sw-draw 1.6s cubic-bezier(.4,0,.2,1) both}
.sw-confetti{position:absolute;top:-24px;animation-name:sw-confetti;animation-timing-function:linear;animation-fill-mode:forwards}
.sw-fill-bar{transform-origin:left;animation:sw-fill .8s cubic-bezier(.2,.8,.2,1) both}
.sw-swirl-bg{background:conic-gradient(from 0deg,#5B2EFF,#FF3D8B,#FF9A62,#5B2EFF);animation:sw-spin 16s linear infinite;filter:blur(64px);opacity:.6}
@media (prefers-reduced-motion:reduce){.sw-root *,.sw-root *::before,.sw-root *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;animation-delay:0s!important;transition-duration:.001ms!important}}
`;

/* ============================== 3. UTILITIES ============================== */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const signed = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : "0");
const cx = (...parts) => parts.filter(Boolean).join(" ");

/** FNV-1a string hash — stable seeds for deterministic mock data. */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — tiny seeded RNG so the mock world looks the same on every load. */
function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const startOfDay = (ts) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function clockTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function shortDate(ts) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayLabel(ts, now = Date.now()) {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return new Date(ts).toLocaleDateString("en-US", { weekday: "long" });
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function timeAgo(ts, now = Date.now()) {
  const d = now - ts;
  if (d < MIN) return "now";
  if (d < HOUR) return `${Math.floor(d / MIN)}m`;
  if (d < DAY) return `${Math.floor(d / HOUR)}h`;
  if (d < 7 * DAY) return `${Math.floor(d / DAY)}d`;
  return shortDate(ts);
}

function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function initials(person) {
  if (!person) return "?";
  return `${(person.name || "?")[0]}${(person.last || "")[0] || ""}`.toUpperCase();
}

function ageOn(y, m, d, now = new Date()) {
  let age = now.getFullYear() - y;
  const mm = now.getMonth() + 1;
  if (mm < m || (mm === m && now.getDate() < d)) age -= 1;
  return age;
}

function isRealDate(y, m, d) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Copy text with graceful fallbacks; resolves to "shared" | "copied" | "manual". */
async function shareOrCopy(text, title = "Swirl") {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch (e) {
    return "manual";
  }
}

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

function useViewport() {
  const read = () => ({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 900 : window.innerHeight,
  });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

/** Scale of the phone frame, so drag distances stay 1:1 with the pointer. */
const FrameScale = createContext(1);

/* ============================== 4. MOCK DATA ============================== */

const GENDERS = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "nonbinary", label: "Nonbinary" },
];

const SHOW_ME = [
  { id: "women", label: "Women", genders: ["woman"] },
  { id: "men", label: "Men", genders: ["man"] },
  { id: "everyone", label: "Everyone", genders: ["woman", "man", "nonbinary"] },
];

const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they", "Prefer not to say"];
const GRAD_YEARS = [2027, 2028, 2029, 2030];

const MAJORS = [
  "Accounting", "Advertising & PR", "Aerospace Engineering", "Applied Math", "Art Practices", "Astrophysics",
  "Atmospheric Science (MS)", "Business Analytics", "Chemical Engineering", "Cinema Studies", "Civil Engineering",
  "Computer Science", "Creative Technology & Design", "Dance", "Ecology & Evolutionary Biology", "Economics",
  "Electrical Engineering", "English", "Environmental Design", "Environmental Studies", "Exploratory Studies",
  "Finance", "Geography", "Information Science", "Integrative Physiology", "International Affairs", "Journalism",
  "Linguistics", "Marketing", "Mechanical Engineering", "Media Production", "Molecular Biology", "Music",
  "Neuroscience", "Philosophy", "Physics", "Political Science", "Psychology", "Sociology", "Spanish", "Theatre",
];

const INTERESTS = [
  "Hiking", "Skiing", "Snowboarding", "Climbing", "Trail running", "Running", "Biking", "Camping", "Fishing",
  "Surfing", "Gym", "Yoga", "Soccer", "Basketball", "Football Saturdays", "Spikeball", "Golf", "Coffee", "Brunch",
  "Cooking", "Baking", "Live music", "Concerts", "Vinyl", "EDM", "Indie", "Hip-hop", "Country", "Karaoke", "Film",
  "Photography", "Art", "Fashion", "Thrifting", "Sneakers", "Anime", "Gaming", "Chess", "Trivia", "Reading",
  "Poetry", "Podcasts", "Astronomy", "Startups", "Investing", "Travel", "Volunteering", "Sustainability",
  "Plant parent", "Dogs", "Cats", "Tarot",
];

const COURSES = [
  "APPM 1350", "APPM 2350", "ASTR 1000", "ATOC 1050", "BCOR 1015", "BCOR 1025", "BCOR 2201", "BCOR 2203",
  "BCOR 2204", "CHEM 1113", "CINE 1502", "CSCI 1300", "CSCI 2270", "EBIO 1210", "ECON 2010", "ECON 2020",
  "ECON 3070", "ENVS 1000", "IPHY 3410", "MATH 1300", "MCDB 1150", "PHIL 1000", "PHYS 1110", "PSYC 1001",
  "SOCY 1001", "WRTG 1150",
];

const DORMS = [
  "Andrews Hall", "Arnett Hall", "Baker Hall", "Buckingham Hall", "Cheyenne Arapaho Hall", "Darley North",
  "Farrand Hall", "Hallett Hall", "Kittredge West", "Libby Hall", "Sewall Hall", "Smith Hall", "Stearns West",
  "Willard Hall", "Williams Village North", "The Hill (off campus)", "Off campus",
];

const CAMPUS_SPOTS = [
  "Norlin Library", "Norlin Quad", "UMC", "Farrand Field", "Folsom Field", "Rec Center", "C4C",
  "Koelbel courtyard", "Engineering Center", "Fiske Planetarium", "Varsity Lake", "Macky Auditorium",
  "The Hill", "Pearl Street", "Chautauqua",
];

const PROMPT_QUESTIONS = [
  "My go-to campus spot is…", // 0
  "The way to win me over is…", // 1
  "A perfect Boulder Saturday looks like…", // 2
  "I'm weirdly competitive about…", // 3
  "Green flags I look for…", // 4
  "My most controversial opinion…", // 5
  "Let's debate this…", // 6
  "The best concert I've been to…", // 7
  "I'll pick the spot if you…", // 8
  "Typical Sunday…", // 9
  "I geek out on…", // 10
  "Two truths and a lie…", // 11
  "Together we could…", // 12
  "My Swirl Night plan…", // 13
];
const promptText = (q) => (typeof q === "number" ? PROMPT_QUESTIONS[q] : q);

/* Photo placeholders: gradient "photos" with an illustrated motif drawn from
   the person's interests, so every profile looks distinct without real images. */
const PALETTES = [
  ["#FF8A5B", "#FF3D8B"], ["#5B2EFF", "#2EC5FF"], ["#12B886", "#7BE3C2"], ["#FFB224", "#FF6A3D"],
  ["#8F5BFF", "#FF7AC6"], ["#2D7FF9", "#7EE8FA"], ["#E2445C", "#FF9F68"], ["#3A1C71", "#D76D77"],
  ["#0F9B8E", "#2D5BFF"], ["#C850C0", "#FFCC70"], ["#4E54C8", "#8F94FB"], ["#11998E", "#38EF7D"],
];

const INTEREST_MOTIF = {
  Hiking: "mountain", "Trail running": "mountain", Climbing: "mountain", Camping: "mountain",
  Skiing: "snow", Snowboarding: "snow", Coffee: "coffee", Brunch: "coffee", Baking: "coffee",
  Vinyl: "music", "Live music": "music", Concerts: "music", EDM: "music", Indie: "music", "Hip-hop": "music",
  Country: "music", Karaoke: "music", Reading: "book", Poetry: "book", Podcasts: "book", Chess: "book", Trivia: "book",
  Dogs: "paw", Cats: "paw", Photography: "camera", Film: "camera", Art: "camera", Fashion: "camera",
  Thrifting: "camera", Anime: "camera", Sneakers: "camera", Astronomy: "night", Gaming: "night", Startups: "night",
  Investing: "night", Tarot: "night", Travel: "sun", Running: "sun", Biking: "sun", Volunteering: "sun",
  Fishing: "wave", Surfing: "wave", Soccer: "ball", Basketball: "ball", "Football Saturdays": "ball",
  Spikeball: "ball", Gym: "ball", Golf: "ball", "Plant parent": "leaf", Yoga: "leaf", Sustainability: "leaf", Cooking: "leaf",
};

const MOTIF_CAPTIONS = {
  mountain: ["Royal Arch summit", "Flatirons, Sunday", "Mt. Sanitas", "Fourteener #6"],
  snow: ["Eldora opening day", "Powder day", "Loveland Pass"],
  coffee: ["Study break", "Pearl St coffee run", "Sunday brunch"],
  music: ["Fox Theatre", "Red Rocks", "Record haul"],
  book: ["Norlin, 3rd floor", "Current read", "Trivia night"],
  paw: ["Meet my dog", "Foster pup", "My roommate's cat"],
  camera: ["Film photo", "Thrift haul", "Behind the camera"],
  night: ["Pearl St at night", "Late night on the Hill", "Stargazing"],
  sun: ["Summer trip", "Golden hour", "Creek path run"],
  wave: ["Boulder Res", "Summer at the lake"],
  ball: ["Farrand Field", "Folsom game day", "Intramurals"],
  leaf: ["Plant shelf tour", "Farmers market", "Garden day"],
};

/* 40 CU Boulder students. g: w/m/n, into: m (men), w (women), e (everyone), wn (women + nonbinary)
   vis: public | tier (tier badge only) | hidden (off the leaderboard). Scores are pre-seeded. */
const RAW_PROFILES = [
  { id: "maya", name: "Maya", last: "Chen", age: 20, g: "w", into: "m", pr: "she/her", major: "Integrative Physiology", grad: 2028, pal: 0, score: 1462, vis: "public",
    bio: "Pre-PT, part-time trail runner, full-time iced oat latte person. I will ask what your Strava says.",
    prompts: [[0, "Third floor of Norlin by the big windows. Silent floor, loud thoughts."], [2, "Royal Arch at sunrise, Snarf's after, nap, then whatever the group chat decides."], [4, "You text back like a normal person and you're nice to servers."]],
    interests: ["Trail running", "Hiking", "Coffee", "Podcasts", "Skiing"], classes: ["IPHY 3410", "CHEM 1113", "PSYC 1001"], dorm: "Off campus", spots: ["Chautauqua", "Norlin Library"] },
  { id: "priya", name: "Priya", last: "Raman", age: 21, g: "w", into: "m", pr: "she/her", major: "Computer Science", grad: 2027, pal: 1, score: 1318, vis: "tier",
    bio: "Building a climbing-gym app nobody asked for. Will debug your life choices for a chai.",
    prompts: [[3, "Chess. I'm 1400 on chess.com and I will not be gracious about it."], [6, "Cereal is a soup. Bring evidence."], [10, "Tiny apps that fix one annoying problem really well."]],
    interests: ["Climbing", "Startups", "Chess", "Coffee", "Anime"], classes: ["CSCI 2270", "APPM 2350"], dorm: "Off campus", spots: ["Engineering Center", "Rec Center"] },
  { id: "sofia", name: "Sofia", last: "Martínez", age: 19, g: "w", into: "e", pr: "she/her", major: "Cinema Studies", grad: 2029, pal: 9, score: 1204, vis: "public",
    bio: "Shooting a short film this semester and I need extras. Also a date to the Fox. Mostly the second one.",
    prompts: [[7, "Phoebe Bridgers at Red Rocks. I cried twice, once on purpose."], [5, "Movie theater popcorn beats most restaurant food."], [8, "Pick the movie. I will rate it out of 10 on the walk home."]],
    interests: ["Film", "Photography", "Thrifting", "Live music", "Indie"], classes: ["CINE 1502", "WRTG 1150", "PSYC 1001"], dorm: "Libby Hall", spots: ["The Hill", "Norlin Quad"] },
  { id: "ava", name: "Ava", last: "Thompson", age: 22, g: "w", into: "m", pr: "she/her", major: "Finance", grad: 2027, pal: 6, score: 1497, vis: "public",
    bio: "Leeds senior who survived recruiting season. Spreadsheets, spicy margs, and people who can hold a conversation.",
    prompts: [[1, "Have an opinion and defend it. Bonus points if it's about restaurants."], [2, "Long run on the creek path, brunch on Pearl, then a ski movie on the couch."], [3, "Fantasy football. I won my league two years running."]],
    interests: ["Investing", "Skiing", "Brunch", "Travel", "Running"], classes: ["BCOR 2204", "ECON 3070"], dorm: "Off campus", spots: ["Koelbel courtyard", "Pearl Street"] },
  { id: "zoe", name: "Zoe", last: "Williams", age: 18, g: "w", into: "m", pr: "she/her", major: "Environmental Studies", grad: 2030, pal: 11, score: 1046, vis: "public",
    bio: "Freshman from Austin learning to ski this winter. Patience is a green flag.",
    prompts: [[4, "You know the name of at least one tree. Bonus if it's correct."], [2, "Farmers market, a creek walk, and a nap I don't feel guilty about."], [9, "Thrift run on the Hill, then homework I swore I'd start Friday."]],
    interests: ["Sustainability", "Hiking", "Thrifting", "Plant parent", "Country"], classes: ["ENVS 1000", "WRTG 1150", "EBIO 1210"], dorm: "Kittredge West", spots: ["Farrand Field", "C4C"] },
  { id: "hannah", name: "Hannah", last: "Kim", age: 20, g: "w", into: "m", pr: "she/her", major: "Psychology", grad: 2028, pal: 4, score: 1122, vis: "tier",
    bio: "Psych major, so yes, I'm analyzing your texting style. Kidding. Mostly.",
    prompts: [[3, "Karaoke. I've been rehearsing the same bridge for months."], [11, "I've met a llama, I'm scared of escalators, I've never seen Star Wars."], [1, "Remember something small I said last week."]],
    interests: ["Podcasts", "Coffee", "Yoga", "Karaoke", "Brunch"], classes: ["PSYC 1001", "SOCY 1001"], dorm: "Off campus", spots: ["UMC", "Pearl Street"] },
  { id: "olivia", name: "Olivia", last: "Brooks", age: 21, g: "w", into: "e", pr: "she/her", major: "Marketing", grad: 2028, pal: 0, score: 1356, vis: "public",
    bio: "Marketing major who will rebrand your group chat. Golden retriever energy, cat person.",
    prompts: [[5, "Pumpkin spice is good and I'm tired of pretending it isn't."], [12, "Open a tiny coffee cart on the Hill. I'll do the logo."], [4, "You're nice to your friends' friends."]],
    interests: ["Fashion", "Thrifting", "Photography", "Cats", "Brunch"], classes: ["BCOR 2201", "ECON 2020"], dorm: "The Hill (off campus)", spots: ["Pearl Street", "Koelbel courtyard"] },
  { id: "isabella", name: "Isabella", last: "Rossi", age: 23, g: "w", into: "m", pr: "she/her", major: "Environmental Design", grad: 2027, pal: 7, score: 1588, vis: "public",
    bio: "ENVD studio rat. If I cancel, a model collapsed. If I don't, that's a good sign.",
    prompts: [[0, "Varsity Lake at golden hour. Best light on campus."], [10, "Old buildings, good chairs, and why some rooms just feel right."], [8, "Let me sketch you. Badly. It's a bit."]],
    interests: ["Art", "Photography", "Coffee", "Travel", "Climbing"], classes: ["PHYS 1110"], dorm: "Off campus", spots: ["Varsity Lake", "Norlin Library"] },
  { id: "grace", name: "Grace", last: "Okafor", age: 19, g: "w", into: "m", pr: "she/her", major: "Neuroscience", grad: 2029, pal: 3, score: 1271, vis: "public",
    bio: "Pre-med with a soft spot for horror movies and hot sauce. I will share my fries.",
    prompts: [[1, "Make me laugh during a scary movie."], [3, "Mario Kart. Rainbow Road is my home track."], [9, "Long run, big breakfast, then pretending to study orgo."]],
    interests: ["Film", "Cooking", "Running", "Volunteering", "Hip-hop"], classes: ["CHEM 1113", "MCDB 1150", "MATH 1300"], dorm: "Hallett Hall", spots: ["Rec Center", "Norlin Library"] },
  { id: "lily", name: "Lily", last: "Nguyen", age: 20, g: "w", into: "e", pr: "she/they", major: "Creative Technology & Design", grad: 2028, pal: 10, score: 1188, vis: "public",
    bio: "I make weird interactive art and very good playlists. Looking for someone to go to Fiske laser shows with.",
    prompts: [[10, "Making lights react to music. My room is basically a rave."], [7, "A tiny DJ set in a basement on the Hill. Changed my life a little."], [12, "Build a pillow fort and rank every Studio Ghibli movie."]],
    interests: ["Art", "EDM", "Gaming", "Astronomy", "Vinyl"], classes: ["CSCI 1300", "ATOC 1050"], dorm: "Darley North", spots: ["Fiske Planetarium", "UMC"] },
  { id: "emma", name: "Emma", last: "Johansson", age: 22, g: "w", into: "m", pr: "she/her", major: "Aerospace Engineering", grad: 2027, pal: 5, score: 1712, vis: "tier",
    bio: "Aero senior. Yes, I can explain orbital mechanics. No, I won't unless you ask nicely.",
    prompts: [[10, "Satellites. Specifically the tiny ones students get to build."], [2, "First chair at Eldora, then hot chocolate and a problem set."], [4, "You're curious about things you don't understand yet."]],
    interests: ["Astronomy", "Skiing", "Climbing", "Gaming", "Coffee"], classes: ["ATOC 1050"], dorm: "Off campus", spots: ["Engineering Center", "Fiske Planetarium"] },
  { id: "chloe", name: "Chloe", last: "Davis", age: 19, g: "w", into: "m", pr: "she/her", major: "Journalism", grad: 2029, pal: 6, score: 978, vis: "public",
    bio: "I write for a campus paper. Tell me your hot take and I might quote you.",
    prompts: [[6, "Folsom Field has the best stadium view in college football."], [0, "The UMC patio. I hear everything."], [3, "Wordle. Don't text me before I've done it."]],
    interests: ["Podcasts", "Coffee", "Football Saturdays", "Reading", "Concerts"], classes: ["WRTG 1150", "PSYC 1001", "ECON 2010"], dorm: "Libby Hall", spots: ["Folsom Field", "UMC"] },
  { id: "aaliyah", name: "Aaliyah", last: "Jackson", age: 21, g: "w", into: "m", pr: "she/her", major: "Political Science", grad: 2028, pal: 9, score: 1402, vis: "public",
    bio: "Mock trial captain and brunch enthusiast. I'll win the argument and then buy you a coffee.",
    prompts: [[1, "Ask a follow-up question. It's rarer than you think."], [12, "Volunteer at the food bank, then debate the best taco on the Hill."], [5, "Breakfast for dinner is better than dinner."]],
    interests: ["Brunch", "Hip-hop", "Travel", "Volunteering", "Fashion"], classes: ["ECON 2020", "SOCY 1001", "PHIL 1000"], dorm: "Off campus", spots: ["Pearl Street", "Norlin Quad"] },
  { id: "mia", name: "Mia", last: "Hernández", age: 20, g: "w", into: "w", pr: "she/her", major: "Dance", grad: 2028, pal: 4, score: 1136, vis: "public",
    bio: "Dancer, plant hoarder, and the friend who always has snacks. Looking for a girl who likes slow Sundays.",
    prompts: [[9, "Farmers market, repotting something, and a long FaceTime with my mom."], [4, "You'll dance badly with me in the kitchen."], [10, "Tarot. I'll pull a card for our first date."]],
    interests: ["Yoga", "Plant parent", "Live music", "Cooking", "Tarot"], classes: ["PSYC 1001", "ATOC 1050"], dorm: "Off campus", spots: ["Chautauqua", "Pearl Street"] },
  { id: "ella", name: "Ella", last: "Fischer", age: 18, g: "w", into: "e", pr: "she/her", major: "Exploratory Studies", grad: 2030, pal: 5, score: 1012, vis: "public",
    bio: "Freshman, undeclared, fully embracing it. Ask my major and get a new answer every time.",
    prompts: [[11, "I've been skydiving, I've met a pop star, I can juggle."], [2, "Spikeball on Farrand, sunset on Flagstaff, C4C late night."], [12, "Try every dining hall dessert and rank them."]],
    interests: ["Snowboarding", "EDM", "Thrifting", "Spikeball", "Travel"], classes: ["WRTG 1150", "ASTR 1000", "ECON 2010"], dorm: "Farrand Hall", spots: ["Farrand Field", "C4C"] },
  { id: "nora", name: "Nora", last: "Patel", age: 22, g: "w", into: "m", pr: "she/her", major: "Molecular Biology", grad: 2027, pal: 2, score: 884, vis: "hidden",
    bio: "Lab by day, trivia by night. I know too much about fruit flies.",
    prompts: [[3, "Trivia. My team name is a pun I'm very proud of."], [10, "Genetics, sourdough, and how those are basically the same thing."], [8, "Promise not to judge my bracket picks."]],
    interests: ["Trivia", "Reading", "Baking", "Hiking", "Chess"], classes: ["MCDB 1150"], dorm: "Off campus", spots: ["Norlin Library", "Norlin Quad"] },
  { id: "riley", name: "Riley", last: "Morgan", age: 24, g: "w", into: "e", pr: "she/her", major: "Atmospheric Science (MS)", grad: 2027, pal: 8, score: 1240, vis: "tier",
    bio: "Grad student studying hail. Yes, really. I'll tell you if it's going to storm on our hike.",
    prompts: [[10, "Clouds. I can name them all and I will."], [4, "You check the forecast before a hike."], [2, "Early hike before the afternoon storms, then a nap with my dog."]],
    interests: ["Hiking", "Camping", "Photography", "Dogs", "Coffee"], classes: ["ATOC 1050"], dorm: "Off campus", spots: ["Chautauqua", "Engineering Center"] },
  { id: "jasmine", name: "Jasmine", last: "Wright", age: 20, g: "w", into: "w", pr: "she/her", major: "Business Analytics", grad: 2028, pal: 1, score: 1059, vis: "public",
    bio: "Data nerd who loves a good playlist and a better taco. Show me your Spotify Wrapped.",
    prompts: [[3, "Pickup basketball. I talk more trash than I should."], [1, "Have a strong opinion about tacos."], [12, "Make a spreadsheet ranking every taco spot in Boulder."]],
    interests: ["Investing", "Hip-hop", "Basketball", "Cooking", "Startups"], classes: ["BCOR 1025", "ECON 2010"], dorm: "Willard Hall", spots: ["Koelbel courtyard", "Rec Center"] },
  { id: "ethan", name: "Ethan", last: "Park", age: 21, g: "m", into: "w", pr: "he/him", major: "Finance", grad: 2028, pal: 5, score: 1298, vis: "public",
    bio: "Leeds junior, driving range regular, and the guy who knows every trivia night on the Hill.",
    prompts: [[2, "Morning ski run, afternoon nap, game night with the roommates."], [3, "Golf. Losing to me is a rite of passage."], [8, "Promise to try the ugly crust at The Sink."]],
    interests: ["Investing", "Golf", "Skiing", "Football Saturdays", "Brunch"], classes: ["BCOR 2203", "ECON 2020"], dorm: "The Hill (off campus)", spots: ["Koelbel courtyard", "Folsom Field"] },
  { id: "marcus", name: "Marcus", last: "Johnson", age: 22, g: "m", into: "w", pr: "he/him", major: "Mechanical Engineering", grad: 2027, pal: 3, score: 1544, vis: "public",
    bio: "Formula SAE team, gym at 6am, and I make a mean breakfast burrito.",
    prompts: [[1, "Let me cook for you. I'm serious about breakfast burritos."], [10, "Engines, suspension geometry, and why my car is always in pieces."], [4, "You show up when you say you will."]],
    interests: ["Gym", "Cooking", "Basketball", "Hip-hop", "Snowboarding"], classes: ["APPM 2350"], dorm: "Off campus", spots: ["Engineering Center", "Rec Center"] },
  { id: "diego", name: "Diego", last: "Ramírez", age: 20, g: "m", into: "w", pr: "he/him", major: "Environmental Studies", grad: 2028, pal: 11, score: 1167, vis: "public",
    bio: "Grew up in Durango and I live for powder days. Looking for a chairlift buddy who doesn't mind the cold.",
    prompts: [[2, "First chair, last chair, then green chile at home."], [12, "Learn to fly fish. I'll teach you, it's mostly untangling."], [5, "Snowboarders and skiers can coexist. Mostly."]],
    interests: ["Skiing", "Camping", "Fishing", "Sustainability", "Country"], classes: ["ENVS 1000", "EBIO 1210", "ATOC 1050"], dorm: "Off campus", spots: ["Chautauqua", "Farrand Field"] },
  { id: "jordan", name: "Jordan", last: "Lee", age: 19, g: "m", into: "w", pr: "he/him", major: "Economics", grad: 2029, pal: 10, score: 1094, vis: "public",
    bio: "Econ major, chess club, and an unhealthy amount of Celsius. Let's argue about tipping culture.",
    prompts: [[6, "Tipping should be built into the menu price."], [0, "Norlin third floor. Back corner. Don't take my seat."], [3, "Chess. Blitz only, I have no patience."]],
    interests: ["Chess", "Investing", "Podcasts", "Basketball", "Coffee"], classes: ["ECON 2010", "MATH 1300", "WRTG 1150"], dorm: "Baker Hall", spots: ["Norlin Library", "UMC"] },
  { id: "noah", name: "Noah", last: "Bennett", age: 21, g: "m", into: "e", pr: "he/him", major: "Astrophysics", grad: 2028, pal: 7, score: 1219, vis: "tier",
    bio: "Astro major. I'll take you stargazing up Flagstaff and name a star after you (unofficially).",
    prompts: [[12, "Watch a meteor shower from the top of Flagstaff."], [10, "Black holes, telescopes, and bad sci-fi movies."], [4, "You ask questions and actually listen to the answer."]],
    interests: ["Astronomy", "Photography", "Hiking", "Reading", "Indie"], classes: ["PHYS 1110", "ASTR 1000", "APPM 1350"], dorm: "Off campus", spots: ["Fiske Planetarium", "Chautauqua"] },
  { id: "liam", name: "Liam", last: "O'Connor", age: 23, g: "m", into: "w", pr: "he/him", major: "Accounting", grad: 2027, pal: 6, score: 874, vis: "public",
    bio: "CPA track, rugby club, and a surprisingly good baker. I'll bring the banana bread.",
    prompts: [[1, "Laugh at my jokes, even the accounting ones."], [9, "Rugby in the morning, banana bread in the afternoon."], [5, "Fruitcake is good. Fight me."]],
    interests: ["Baking", "Gym", "Football Saturdays", "Travel", "Investing"], classes: ["BCOR 2203"], dorm: "Off campus", spots: ["Koelbel courtyard", "Folsom Field"] },
  { id: "kai", name: "Kai", last: "Nakamura", age: 20, g: "m", into: "e", pr: "he/they", major: "Media Production", grad: 2028, pal: 1, score: 1333, vis: "public",
    bio: "I shoot music videos for local bands. Looking for a muse, or at least someone to hold the light.",
    prompts: [[7, "A tiny show at the Fox where the drummer broke a stick and kept going."], [8, "Let me pick the record store."], [10, "Film cameras. Yes, they still make film."]],
    interests: ["Film", "Vinyl", "Live music", "Photography", "Thrifting"], classes: ["CINE 1502", "ATOC 1050"], dorm: "Off campus", spots: ["The Hill", "Pearl Street"] },
  { id: "tyler", name: "Tyler", last: "Lindqvist", age: 19, g: "m", into: "w", pr: "he/him", major: "Marketing", grad: 2029, pal: 8, score: 1003, vis: "public",
    bio: "Lake kid from Minnesota adjusting to mountains. Teach me to ski and I'll teach you to fish.",
    prompts: [[12, "Trade lessons. Skiing for fishing, deal?"], [2, "Folsom tailgate, the game, then Cosmo's at 1am."], [3, "Spikeball. Undefeated on Farrand (don't check)."]],
    interests: ["Fishing", "Football Saturdays", "Spikeball", "Country", "Gym"], classes: ["ECON 2010", "WRTG 1150", "PSYC 1001"], dorm: "Cheyenne Arapaho Hall", spots: ["Farrand Field", "Folsom Field"] },
  { id: "omar", name: "Omar", last: "Haddad", age: 22, g: "m", into: "w", pr: "he/him", major: "International Affairs", grad: 2027, pal: 0, score: 1436, vis: "public",
    bio: "I speak three languages, cook four cuisines, and I'm still learning to parallel park.",
    prompts: [[1, "Let me cook you my grandmother's recipes."], [12, "Plan a trip we probably can't afford yet."], [10, "Maps, languages, and street food."]],
    interests: ["Travel", "Cooking", "Soccer", "Coffee", "Reading"], classes: ["ECON 2020", "PHIL 1000"], dorm: "Off campus", spots: ["Norlin Quad", "Pearl Street"] },
  { id: "ben", name: "Ben", last: "Goldberg", age: 20, g: "m", into: "m", pr: "he/him", major: "Computer Science", grad: 2028, pal: 2, score: 1110, vis: "public",
    bio: "CS major, bad at Mario Kart, good at fresh pasta. Looking for my player two.",
    prompts: [[1, "Pasta from scratch. I'll even let you crank the machine."], [3, "Mario Kart, which is a problem because I always lose."], [12, "Co-op every game on the shelf."]],
    interests: ["Gaming", "Cooking", "Anime", "Climbing", "Film"], classes: ["CSCI 2270", "CSCI 1300", "MATH 1300"], dorm: "Darley North", spots: ["Engineering Center", "UMC"] },
  { id: "alex", name: "Alex", last: "Rivera", age: 21, g: "m", into: "m", pr: "he/him", major: "Psychology", grad: 2028, pal: 9, score: 1262, vis: "public",
    bio: "Barista on Pearl, so yes, I'll judge your order. Lovingly.",
    prompts: [[5, "Iced coffee in winter is correct."], [4, "You're kind to people who can't do anything for you."], [9, "Opening shift, then a long walk on the creek path."]],
    interests: ["Coffee", "Yoga", "Thrifting", "Indie", "Plant parent"], classes: ["PSYC 1001", "SOCY 1001"], dorm: "Off campus", spots: ["Pearl Street", "Varsity Lake"] },
  { id: "sam", name: "Sam", last: "Carter", age: 22, g: "m", into: "e", pr: "he/him", major: "Information Science", grad: 2027, pal: 10, score: 856, vis: "hidden",
    bio: "UX nerd who sketches interfaces on napkins. I'll redesign the menu while we wait.",
    prompts: [[10, "Why some apps feel good and some feel like homework."], [8, "Let me pick the coffee shop. I have a ranked list."], [6, "Dark mode is better. Always."]],
    interests: ["Art", "Startups", "Coffee", "Biking", "Podcasts"], classes: ["CSCI 1300"], dorm: "Off campus", spots: ["UMC", "Norlin Library"] },
  { id: "julian", name: "Julian", last: "Moreau", age: 20, g: "m", into: "m", pr: "he/him", major: "Music", grad: 2028, pal: 4, score: 1178, vis: "tier",
    bio: "Jazz piano major. I'll play you something in the practice rooms if you ask nicely.",
    prompts: [[7, "A jazz trio in a New Orleans basement. I still think about it."], [1, "Send me a song you love without explaining it."], [9, "Practice, coffee, practice, a long dinner with friends."]],
    interests: ["Live music", "Vinyl", "Coffee", "Reading", "Cooking"], classes: ["PHIL 1000"], dorm: "Andrews Hall", spots: ["Macky Auditorium", "Norlin Quad"] },
  { id: "caleb", name: "Caleb", last: "Wilson", age: 18, g: "m", into: "w", pr: "he/him", major: "Civil Engineering", grad: 2030, pal: 11, score: 968, vis: "public",
    bio: "Freshman engineer from the Springs. Fourteener count: 6. Looking for someone to help me get to 7.",
    prompts: [[12, "Summit a fourteener and split a sandwich at the top."], [2, "Alarm at 4am, trailhead at 5, nap by 2."], [4, "You pack extra snacks."]],
    interests: ["Hiking", "Camping", "Gym", "Snowboarding", "Country"], classes: ["APPM 1350", "PHYS 1110", "CHEM 1113"], dorm: "Williams Village North", spots: ["Engineering Center", "Rec Center"] },
  { id: "jamal", name: "Jamal", last: "Edwards", age: 21, g: "m", into: "w", pr: "he/him", major: "Advertising & PR", grad: 2028, pal: 6, score: 1621, vis: "public",
    bio: "I shoot most of the fits you see on Pearl. Let me take your new profile pics.",
    prompts: [[10, "Sneakers, film photography, and good lighting."], [8, "Let me take your picture at golden hour."], [5, "Socks with slides are a valid choice."]],
    interests: ["Photography", "Fashion", "Sneakers", "Hip-hop", "Basketball"], classes: ["ECON 2010"], dorm: "Off campus", spots: ["Pearl Street", "The Hill"] },
  { id: "lucas", name: "Lucas", last: "Silva", age: 20, g: "m", into: "w", pr: "he/him", major: "Physics", grad: 2028, pal: 8, score: 1145, vis: "public",
    bio: "Physics major who surfs (badly) every summer in Rio. Boulder Res is my ocean replacement.",
    prompts: [[10, "Waves. Ocean waves and the physics kind."], [12, "Paddleboard the Res and get sunburned together."], [3, "Pickup soccer. I play like it's the World Cup."]],
    interests: ["Soccer", "Travel", "Surfing", "Astronomy", "Gym"], classes: ["APPM 2350", "PHYS 1110"], dorm: "Off campus", spots: ["Rec Center", "Varsity Lake"] },
  { id: "owen", name: "Owen", last: "Murphy", age: 19, g: "m", into: "w", pr: "he/him", major: "Political Science", grad: 2029, pal: 3, score: 1028, vis: "public",
    bio: "Debate kid, Buffs football diehard, and I'll actually plan the date. Itinerary included.",
    prompts: [[8, "Let me plan the whole thing. Shared doc and everything."], [6, "Pineapple on pizza is fine and the hate is performative."], [0, "Folsom Field on game day. Nothing else comes close."]],
    interests: ["Football Saturdays", "Podcasts", "Basketball", "Volunteering", "Spikeball"], classes: ["ECON 2010", "WRTG 1150", "SOCY 1001"], dorm: "Buckingham Hall", spots: ["Folsom Field", "UMC"] },
  { id: "river", name: "River", last: "Adams", age: 20, g: "n", into: "e", pr: "they/them", major: "Ecology & Evolutionary Biology", grad: 2028, pal: 2, score: 1198, vis: "public",
    bio: "Bird nerd, mushroom forager, and terrible at goodbyes. Let's get lost on a trail.",
    prompts: [[10, "Birds. I'll point out every one and you'll pretend to care."], [2, "Slow hike, a picnic, and a field guide."], [4, "You're gentle with animals and waiters."]],
    interests: ["Hiking", "Photography", "Sustainability", "Camping", "Tarot"], classes: ["EBIO 1210", "ENVS 1000"], dorm: "Off campus", spots: ["Chautauqua", "Varsity Lake"] },
  { id: "quinn", name: "Quinn", last: "Taylor", age: 21, g: "n", into: "e", pr: "they/them", major: "Art Practices", grad: 2028, pal: 9, score: 1381, vis: "tier",
    bio: "Printmaker and part-time DJ at house shows. My love language is making you a zine.",
    prompts: [[1, "Come to my set and dance even if no one else is."], [12, "Make a zine about our favorite Boulder spots."], [5, "Thrifted is always better than new."]],
    interests: ["Art", "EDM", "Thrifting", "Vinyl", "Poetry"], classes: ["PHIL 1000"], dorm: "Off campus", spots: ["The Hill", "UMC"] },
  { id: "avery", name: "Avery", last: "Collins", age: 19, g: "n", into: "e", pr: "they/them", major: "Linguistics", grad: 2029, pal: 5, score: 1067, vis: "public",
    bio: "Linguistics major. I will notice how you say 'bagel' and I will bring it up later.",
    prompts: [[10, "Accents, slang, and why everyone in Boulder says 'stoked'."], [3, "Karaoke duets. I take harmony seriously."], [11, "I'm learning Japanese, I've read every Discworld book, I hate cheese."]],
    interests: ["Reading", "Anime", "Chess", "Coffee", "Karaoke"], classes: ["WRTG 1150", "PSYC 1001", "ASTR 1000"], dorm: "Sewall Hall", spots: ["Norlin Library", "C4C"] },
  { id: "rowan", name: "Rowan", last: "Blake", age: 22, g: "n", into: "e", pr: "he/they", major: "Theatre", grad: 2027, pal: 7, score: 891, vis: "public",
    bio: "Theatre kid all grown up (not really). Improv on Fridays, karaoke on Saturdays, recovering on Sundays.",
    prompts: [[1, "Yes, and. That's the whole rule."], [7, "A musical in a converted barn. Nobody believes me it was good."], [9, "Improv practice, then brunch with the cast."]],
    interests: ["Karaoke", "Film", "Poetry", "Brunch", "Live music"], classes: ["PHIL 1000"], dorm: "Off campus", spots: ["Macky Auditorium", "The Hill"] },
  { id: "sage", name: "Sage", last: "Morales", age: 20, g: "n", into: "wn", pr: "she/they", major: "Philosophy", grad: 2028, pal: 10, score: 1307, vis: "public",
    bio: "Philosophy major and climbing gym regular. Ask me about free will on the bouldering wall.",
    prompts: [[6, "Is a hot dog a sandwich? I have a 10-minute answer."], [0, "The Rec Center bouldering wall, at least four days a week."], [4, "You change your mind when you learn something."]],
    interests: ["Climbing", "Reading", "Coffee", "Podcasts", "Yoga"], classes: ["PHIL 1000", "SOCY 1001"], dorm: "Off campus", spots: ["Rec Center", "Norlin Quad"] },
];

/* Swirl Night drop: a special batch that only shows up in Discover while the event is live. */
const DROP_PROFILES = [
  { id: "camila", name: "Camila", last: "Torres", age: 20, g: "w", into: "m", pr: "she/her", major: "Spanish", grad: 2028, pal: 0, score: 1274, vis: "public", drop: true,
    bio: "Here for Swirl Night, honestly. Salsa dancer, taco critic, and the friend who plans the trip.",
    prompts: [[13, "Fox Theatre show, then late-night tacos. I have a ranking."], [1, "Dance badly with me. Confidence is the whole thing."], [9, "Farmers market, a nap, then calling my abuela."]],
    interests: ["Travel", "Cooking", "Live music", "Brunch", "Volunteering"], classes: ["SOCY 1001", "WRTG 1150"], dorm: "Off campus", spots: ["Pearl Street", "The Hill"] },
  { id: "theo", name: "Theo", last: "Laurent", age: 21, g: "m", into: "w", pr: "he/him", major: "Geography", grad: 2028, pal: 8, score: 1189, vis: "public", drop: true,
    bio: "Map nerd who draws custom trail maps for friends. I'll make one for our first date.",
    prompts: [[13, "Sunset on Flagstaff, then hot chocolate on the Hill."], [10, "Maps. Old ones, new ones, the ones I draw on napkins."], [4, "You're down for a spontaneous detour."]],
    interests: ["Hiking", "Art", "Travel", "Coffee", "Biking"], classes: ["ENVS 1000", "ECON 2010"], dorm: "Off campus", spots: ["Chautauqua", "Norlin Quad"] },
  { id: "bella", name: "Bella", last: "Okonkwo", age: 19, g: "w", into: "e", pr: "she/her", major: "Advertising & PR", grad: 2029, pal: 9, score: 1093, vis: "public", drop: true,
    bio: "Content creator in training. I will make our coffee date look cinematic.",
    prompts: [[13, "Matching fits, a Pearl St photo walk, and boba."], [3, "Getting the perfect shot. I'll make you redo it."], [8, "Let me pick the outfit theme."]],
    interests: ["Fashion", "Photography", "Coffee", "Hip-hop", "Thrifting"], classes: ["PSYC 1001", "WRTG 1150", "ECON 2010"], dorm: "Libby Hall", spots: ["Pearl Street", "UMC"] },
  { id: "max", name: "Max", last: "Hoffman", age: 22, g: "m", into: "e", pr: "he/him", major: "Chemical Engineering", grad: 2027, pal: 3, score: 1356, vis: "tier", drop: true,
    bio: "Chem E senior who brews kombucha in his kitchen. It's mostly safe.",
    prompts: [[13, "Trivia night. I'm the science guy on the team."], [10, "Fermentation. Kombucha, sourdough, kimchi."], [5, "Kombucha is better than soda."]],
    interests: ["Cooking", "Trivia", "Climbing", "Indie", "Coffee"], classes: ["CHEM 1113"], dorm: "Off campus", spots: ["Engineering Center", "The Hill"] },
  { id: "luna", name: "Luna", last: "Park", age: 20, g: "w", into: "w", pr: "she/her", major: "Music", grad: 2028, pal: 4, score: 1148, vis: "public", drop: true,
    bio: "Cellist by day, bedroom pop by night. Swirl Night is my one night off from practicing.",
    prompts: [[13, "Laser show at Fiske, then writing a song about it."], [7, "Mitski at the Mission Ballroom. Still not over it."], [4, "You'll listen to my demos and be honest."]],
    interests: ["Live music", "Vinyl", "Indie", "Astronomy", "Reading"], classes: ["PHIL 1000", "ATOC 1050"], dorm: "Andrews Hall", spots: ["Macky Auditorium", "Fiske Planetarium"] },
  { id: "eli", name: "Eli", last: "Santos", age: 21, g: "m", into: "m", pr: "he/him", major: "Neuroscience", grad: 2028, pal: 1, score: 1225, vis: "public", drop: true,
    bio: "Pre-med, ex-swimmer, current brunch person. Only here for Swirl Night, so let's make it count.",
    prompts: [[13, "Coffee, a walk on the creek path, then pancakes."], [1, "Be a little nerdy and a lot kind."], [3, "Swimming. I will race you."]],
    interests: ["Brunch", "Running", "Volunteering", "Podcasts", "Travel"], classes: ["MCDB 1150", "CHEM 1113"], dorm: "Off campus", spots: ["Rec Center", "Pearl Street"] },
  { id: "wren", name: "Wren", last: "Ellis", age: 20, g: "n", into: "e", pr: "they/them", major: "Environmental Design", grad: 2028, pal: 11, score: 1061, vis: "public", drop: true,
    bio: "Studio kid who builds tiny houses out of cardboard. Looking for someone to bike to Chautauqua with.",
    prompts: [[13, "Bike ride, picnic, and judging houses on Mapleton Hill."], [10, "Tiny homes and good bike lanes."], [4, "You'll ride the long way home."]],
    interests: ["Biking", "Art", "Sustainability", "Coffee", "Plant parent"], classes: ["ENVS 1000"], dorm: "Off campus", spots: ["Chautauqua", "Varsity Lake"] },
  { id: "harper", name: "Harper", last: "Lowe", age: 18, g: "w", into: "m", pr: "she/her", major: "Exploratory Studies", grad: 2030, pal: 6, score: 1002, vis: "public", drop: true,
    bio: "Freshman who joined for Swirl Night. Into snowboarding, sour candy, and bad horror movies.",
    prompts: [[13, "Cosmo's slices and a horror movie marathon in the Libby lounge."], [11, "I've snowboarded in Japan, I hate chocolate, I've never broken a bone."], [3, "Sour candy challenges. I always win."]],
    interests: ["Snowboarding", "Film", "Gaming", "Thrifting", "EDM"], classes: ["WRTG 1150", "PSYC 1001", "ECON 2010"], dorm: "Libby Hall", spots: ["C4C", "Farrand Field"] },
];

/* Friends you can invite to Group mode (they're on Swirl, but not in your deck). */
const FRIENDS = [
  { id: "f_jake", name: "Jake", last: "Morrison", major: "Mechanical Engineering", pal: 5, note: "Your roommate" },
  { id: "f_tess", name: "Tess", last: "Alvarez", major: "Psychology", pal: 0, note: "From WRTG 1150" },
  { id: "f_nico", name: "Nico", last: "Baptiste", major: "Finance", pal: 3, note: "Intramural soccer" },
  { id: "f_ruby", name: "Ruby", last: "Sato", major: "Cinema Studies", pal: 4, note: "Libby Hall, 2nd floor" },
  { id: "f_dev", name: "Dev", last: "Kapoor", major: "Computer Science", pal: 8, note: "Club climbing" },
  { id: "f_hailey", name: "Hailey", last: "Moss", major: "Marketing", pal: 9, note: "From orientation" },
].map((f) => ({ ...f, photos: [{ kind: "art", pal: f.pal, motif: "portrait" }] }));
const FRIENDS_BY_ID = Object.fromEntries(FRIENDS.map((f) => [f.id, f]));

/* Groups of up to 3 you can swipe on in Group mode. Members reference the profiles above. */
const GROUPS = [
  { id: "g_summit", name: "Summit Society", members: ["maya", "diego", "river"], vibe: "Trailheads at 6am, coffee after. Recruiting a crew for weekend hikes.", tags: ["Hiking", "Coffee"] },
  { id: "g_brunch", name: "Pearl St Brunch Club", members: ["olivia", "aaliyah", "hannah"], vibe: "Pancake flights and people-watching. Bring your best brunch hot take.", tags: ["Brunch", "Fashion"] },
  { id: "g_fox", name: "Fox Front Row", members: ["kai", "quinn", "lily"], vibe: "We go to every show on the Hill. Come to the next one with us.", tags: ["Live music", "Art"] },
  { id: "g_leeds", name: "Leeds Lunch Table", members: ["ava", "ethan", "jasmine"], vibe: "Talk markets, then talk about anything but markets.", tags: ["Investing", "Brunch"] },
  { id: "g_trivia", name: "Trivia Night Ringers", members: ["nora", "omar", "avery"], vibe: "We need a fourth for trivia. Must know 2000s pop and at least one capital city.", tags: ["Trivia", "Reading"] },
  { id: "g_farrand", name: "Farrand Field FC", members: ["tyler", "owen", "lucas"], vibe: "Pickup soccer and Spikeball on Sundays. Snacks provided.", tags: ["Soccer", "Spikeball"] },
  { id: "g_eng", name: "Engineering Center After Dark", members: ["emma", "marcus", "ben"], vibe: "Problem sets by day, Cosmo's at midnight.", tags: ["Gaming", "Climbing"] },
  { id: "g_kitt", name: "Kittredge Kids", members: ["zoe", "ella", "caleb"], vibe: "Freshmen looking for a crew for game days and C4C dinners.", tags: ["Football Saturdays", "Hiking"] },
];

/* 15 real Boulder spots used as mock date ideas. Verify details before launch. */
const DATE_SPOTS = [
  { id: "buchanans", name: "Buchanan's Coffee Pub", cat: "coffee", area: "The Hill", blurb: "Cozy booths two blocks from campus. Easy first hello.", tags: ["Coffee", "Reading", "Chess"] },
  { id: "ozo", name: "Ozo Coffee", cat: "coffee", area: "Pearl St", blurb: "Bright, busy, great oat lattes. Walk the mall after.", tags: ["Coffee", "Brunch", "Photography"] },
  { id: "trident", name: "Trident Booksellers & Cafe", cat: "coffee", area: "Pearl St", blurb: "Used books up front, espresso in back. Pick a book for each other.", tags: ["Reading", "Poetry", "Coffee"] },
  { id: "laughinggoat", name: "Laughing Goat", cat: "coffee", area: "Pearl St", blurb: "Open late, with live music some nights.", tags: ["Live music", "Coffee", "Indie"] },
  { id: "chautauqua", name: "Chautauqua Park", cat: "outdoors", area: "South Boulder", blurb: "Hike toward Royal Arch or keep it chill on the meadow with snacks.", tags: ["Hiking", "Trail running", "Photography", "Dogs"] },
  { id: "flagstaff", name: "Flagstaff Mountain", cat: "outdoors", area: "Flagstaff Rd", blurb: "Drive up for sunset over the city. Bring a blanket.", tags: ["Photography", "Astronomy", "Hiking"] },
  { id: "creekpath", name: "Boulder Creek Path", cat: "outdoors", area: "Downtown", blurb: "Walk or bike the creek. Easy to make it longer if it's going well.", tags: ["Running", "Dogs", "Biking"] },
  { id: "farrand", name: "Farrand Field", cat: "outdoors", area: "On campus", blurb: "Frisbee, Spikeball, or a picnic with a Flatirons view.", tags: ["Spikeball", "Soccer", "Football Saturdays"] },
  { id: "sink", name: "The Sink", cat: "food", area: "The Hill", blurb: "Boulder institution since 1923. Ugly crust pizza and graffiti walls.", tags: ["Football Saturdays", "Cooking", "Brunch"] },
  { id: "petes", name: "Illegal Pete's", cat: "food", area: "The Hill", blurb: "Burritos, big booths, zero pressure.", tags: ["Hip-hop", "Live music", "Cooking"] },
  { id: "dushanbe", name: "Boulder Dushanbe Teahouse", cat: "food", area: "Downtown", blurb: "Hand-carved teahouse from Boulder's sister city. Peak cozy.", tags: ["Art", "Travel", "Brunch", "Yoga"] },
  { id: "cosmos", name: "Cosmo's Pizza", cat: "food", area: "The Hill", blurb: "Late-night slices after a show or a study session.", tags: ["Gaming", "EDM", "Anime"] },
  { id: "fox", name: "The Fox Theatre", cat: "nightlife", area: "The Hill", blurb: "Small venue, big shows. Check the calendar for 18+ nights.", tags: ["Live music", "Concerts", "EDM", "Indie"] },
  { id: "fiske", name: "Fiske Planetarium", cat: "nightlife", area: "On campus", blurb: "Laser shows and star talks under the dome.", tags: ["Astronomy", "Vinyl", "Film"] },
  { id: "darkhorse", name: "Dark Horse", cat: "nightlife", area: "Baseline Rd", blurb: "Trivia night in a bar full of oddities. 21+.", tags: ["Trivia", "Chess", "Karaoke"], age21: true },
];
const SPOTS_BY_ID = Object.fromEntries(DATE_SPOTS.map((s) => [s.id, s]));
const SPOT_CATS = {
  coffee: { label: "Coffee", Icon: Coffee },
  outdoors: { label: "Outdoors", Icon: Mountain },
  food: { label: "Food", Icon: Utensils },
  nightlife: { label: "Nightlife", Icon: Music },
};

/* Campus rivalry: weekly activity across three Colorado schools (mock numbers). */
const RIVALRY_SEED = {
  cu: { id: "cu", name: "CU Boulder", short: "CU", color: "#CFB87C", active: 6412, swipes: 48210, matches: 3112, dates: 402 },
  csu: { id: "csu", name: "Colorado State", short: "CSU", color: "#2E8B57", active: 5980, swipes: 46876, matches: 3011, dates: 371 },
  du: { id: "du", name: "University of Denver", short: "DU", color: "#C8102E", active: 2340, swipes: 21840, matches: 1530, dates: 238 },
};

const SEASON_LABELS = ["Season 1 · Fall ’26", "Season 2 · Spring ’27", "Season 3 · Fall ’27", "Season 4 · Spring ’28"];
const seasonLabel = (n) => SEASON_LABELS[n - 1] || `Season ${n}`;

/* Demo account for "Explore the demo" — a sophomore with two weeks of history. */
const DEMO_ACCOUNT = {
  id: "me", name: "Jamie", last: "Rowe", email: "jamie.rowe@colorado.edu", age: 20, birthday: { y: 2006, m: 3, d: 14 },
  gender: "man", showMe: "women", pronouns: "he/him", major: "Economics", grad: 2029, pal: 1,
  bio: "Sophomore econ major who runs on Celsius and Buffs football. Looking for someone to drag me up Chautauqua before 8am.",
  prompts: [
    { q: 0, a: "The UMC patio when it's sunny. Best people-watching on campus." },
    { q: 3, a: "Spikeball. I take it way too seriously." },
    { q: 8, a: "Pick the playlist for the drive up Flagstaff." },
  ],
  interests: ["Football Saturdays", "Hiking", "Spikeball", "Coffee", "Investing", "Live music"],
  classes: ["ECON 2010", "WRTG 1150", "PSYC 1001", "MATH 1300"], dorm: "Libby Hall", spots: ["Norlin Library", "Farrand Field", "The Hill"],
  visibility: "public",
  photos: [{ kind: "art", pal: 1, motif: "portrait" }, { kind: "art", pal: 5, motif: "mountain", caption: "Royal Arch summit" }, { kind: "art", pal: 3, motif: "ball", caption: "Farrand Field" }],
};
const DEMO_HISTORY = [1112, 1120, 1117, 1139, 1151, 1146, 1163, 1158, 1177, 1190, 1182, 1203, 1219, 1242];
const DEMO_STATS = { likes: 64, likePts: 617, supers: 3, superPts: 75, passes: 160, passPts: -480, replies: 4, replyPts: 20, dates: 1, datePts: 15, ghosts: 1, ghostPts: -5 };

/* Pre-seeded conversations, assigned to your first three compatible matches. */
const SEED_THREADS = [
  { ago: 2 * DAY + 3 * HOUR, msgs: [
    ["them", "Okay, important question. Royal Arch or Flagstaff for sunrise?", 2 * DAY + 2 * HOUR],
    ["me", "Flagstaff, because I can drive most of it", 2 * DAY + 90 * MIN],
    ["them", "Respect the honesty. Royal Arch is worth the climb though", 2 * DAY + HOUR],
    ["them", "Free Saturday morning? I'll bring the coffee ☕", 20 * HOUR],
  ] },
  { ago: DAY + 6 * HOUR, msgs: [
    ["them", "Real question: Norlin or the UMC for studying?", DAY + 5 * HOUR],
    ["me", "Norlin third floor. No contest", DAY + 4 * HOUR],
    ["them", "Correct. Study date Thursday? Loser of the flashcard race buys coffee", DAY + 3 * HOUR],
    ["me", "Deal. Fair warning, I'm very competitive about flashcards", DAY + 2 * HOUR],
  ] },
  { ago: 9 * HOUR, msgs: [
    ["me", "Okay, have you been to a show at the Fox yet?", 8 * HOUR],
    ["them", "Twice this month 😅 A local band I love plays next Friday. You in?", 6 * HOUR],
  ] },
];
const SEED_NEW_MATCH_AGES = [3 * HOUR, 40 * MIN];
const SEED_MATCH_PREFS = ["maya", "sofia", "olivia", "lily", "grace", "jordan", "kai", "river", "ethan", "alex", "quinn", "noah", "sage", "ben", "julian", "avery", "mia", "jasmine", "diego", "aaliyah"];

const REPORT_REASONS = [
  "Fake profile or catfish",
  "Inappropriate photos",
  "Harassment or hate",
  "Seems under 18",
  "Scam or spam",
  "Made me feel unsafe",
  "Something else",
];

const SAFETY_TIPS = [
  { title: "Meet somewhere public", body: "Pick a busy spot like a coffee shop on the Hill or the UMC. Skip dorms and apartments for first dates." },
  { title: "Tell a friend the plan", body: "Share who you're meeting, where, and when. Use Share your date plans below." },
  { title: "Get yourself there and back", body: "Take your own bike, bus, or ride so you can leave whenever you want." },
  { title: "Video chat first", body: "A quick call confirms they're who their photos say they are." },
  { title: "Watch your drink", body: "Keep it in sight, and if you're 21+, know your limit. You never owe anyone a second round." },
  { title: "Trust your gut", body: "You can end a date at any time, for any reason. Leaving early is always okay." },
  { title: "Keep chats in Swirl", body: "Stay on Swirl until you're comfortable, so reporting and blocking still work." },
  { title: "Never send money", body: "No one you meet on Swirl should ask for money, gift cards, or crypto. Report it right away." },
];

/* ======================= 5. SCORING & RANKING LOGIC ======================= */

const SCORING = {
  START: 1000, // every account starts here, and every semester resets here
  FLOOR: 500, // a score can never drop below this
  LIKE: 10, // like received (before weighting)
  SUPER: 25, // super like received (before weighting)
  PASS: -3, // pass received — flat, so passes cost less than likes give
  REPLY_24H: 5, // first message in a new match within 24h
  DATE_CONFIRMED: 15, // both people confirm they went on a date
  GHOST_UNMATCH: -5, // unmatching someone you never replied to
  MULT_MIN: 0.5,
  MULT_MAX: 2,
};

const TIERS = [
  { id: "bronze", name: "Bronze", min: 0, from: "#E7A877", to: "#A65F38", shape: "medal" },
  { id: "silver", name: "Silver", min: 900, from: "#F1F4F9", to: "#97A3B6", shape: "shield" },
  { id: "gold", name: "Gold", min: 1100, from: "#FFE38A", to: "#EFA415", shape: "star" },
  { id: "platinum", name: "Platinum", min: 1300, from: "#B9FFF1", to: "#33BFB1", shape: "hex" },
  { id: "diamond", name: "Diamond", min: 1500, from: "#A9D6FF", to: "#C38BFF", shape: "gem" },
];
const TIER_INDEX = Object.fromEntries(TIERS.map((t, i) => [t.id, i]));

function tierFor(score) {
  for (let i = TIERS.length - 1; i >= 0; i--) if (score >= TIERS[i].min) return TIERS[i];
  return TIERS[0];
}
const nextTier = (score) => TIERS.find((t) => t.min > score) || null;

/** Weight of a swipe received: a like from a higher-scored person is worth more. */
function swipeMultiplier(swiperScore, receiverScore) {
  return clamp(swiperScore / Math.max(1, receiverScore), SCORING.MULT_MIN, SCORING.MULT_MAX);
}

/** Points the receiver gets from one swipe. Likes and Super Likes are weighted; passes are a flat −3. */
function swipeDelta(kind, swiperScore, receiverScore) {
  if (kind === "pass") return SCORING.PASS;
  const base = kind === "super" ? SCORING.SUPER : SCORING.LIKE;
  return Math.round(base * swipeMultiplier(swiperScore, receiverScore));
}

/** Apply a change, respecting the 500 floor. */
const applyDelta = (score, delta) => Math.max(SCORING.FLOOR, score + delta);

const emptyStats = () => ({ likes: 0, likePts: 0, supers: 0, superPts: 0, passes: 0, passPts: 0, replies: 0, replyPts: 0, dates: 0, datePts: 0, ghosts: 0, ghostPts: 0 });

function meEntry(state) {
  const a = state.account;
  return {
    id: "me", isMe: true, name: a.name, last: a.last || "", photos: a.photos, pal: a.pal, grad: a.grad,
    visibility: a.visibility, score: state.my.score, scoreYesterday: state.my.yesterday, weekGain: state.my.weekGain,
  };
}

/** Rank entries by value (desc) and compute movement against the previous value. */
function rankList(entries, valueOf, prevOf) {
  const order = (f) => (x, y) => f(y) - f(x) || x.name.localeCompare(y.name) || x.id.localeCompare(y.id);
  const prevRank = new Map([...entries].sort(order(prevOf)).map((e, i) => [e.id, i + 1]));
  // Right after a semester reset everyone's "yesterday" is identical, so movement would be noise.
  const flat = entries.every((e) => prevOf(e) === prevOf(entries[0]));
  return [...entries].sort(order(valueOf)).map((e, i) => ({ ...e, rank: i + 1, move: flat ? 0 : prevRank.get(e.id) - (i + 1), value: valueOf(e) }));
}

/**
 * Leaderboard for a tab ("campus" | "week" | "class").
 * Hidden people never appear. Blocked people never appear to the blocker.
 * My row appears only if I'm visible and not paused, but `mine` always holds my private rank.
 * "week" ranks by score gained in the last 7 days; movement compares against before today's activity.
 */
function getBoard(state, tab = "campus", classYear = null) {
  const blocked = new Set(state.blocked);
  let people = Object.values(state.users).filter((u) => u.visibility !== "hidden" && !blocked.has(u.id));
  if (tab === "class") people = people.filter((u) => u.grad === classYear);
  const me = state.account ? meEntry(state) : null;
  const meInScope = me && (tab !== "class" || me.grad === classYear);
  const valueOf = tab === "week" ? (e) => e.weekGain : (e) => e.score;
  const prevOf = tab === "week" ? (e) => e.weekGain - (e.score - e.scoreYesterday) : (e) => e.scoreYesterday;
  const withMe = rankList(meInScope ? [...people, me] : people, valueOf, prevOf);
  const mine = withMe.find((e) => e.isMe) || null;
  const meVisible = meInScope && me.visibility !== "hidden" && !state.paused;
  const rows = meVisible ? withMe : rankList(people, valueOf, prevOf);
  return { rows, mine, total: withMe.length };
}

/* ======================= 6. SIMULATION HELPERS ======================= */

const GENDER_CODE = { w: "woman", m: "man", n: "nonbinary" };
const INTO_CODE = { m: ["man"], w: ["woman"], e: ["woman", "man", "nonbinary"], wn: ["woman", "nonbinary"] };
const DEFAULT_FILTERS = { ageMin: 18, ageMax: 24, grads: [], majors: [], interests: [] };

function makePhotos(p) {
  const rng = seeded(hashStr(`${p.id}-photos`));
  const motifs = [];
  (p.interests || []).forEach((i) => {
    const m = INTEREST_MOTIF[i];
    if (m && !motifs.includes(m)) motifs.push(m);
  });
  const count = 3 + Math.floor(rng() * 3);
  const photos = [{ kind: "art", pal: p.pal, motif: "portrait", angle: 155 }];
  for (let i = 0; i < count - 1 && i < motifs.length; i++) {
    const caps = MOTIF_CAPTIONS[motifs[i]];
    photos.push({
      kind: "art", motif: motifs[i], pal: (p.pal + 2 + i * 3 + Math.floor(rng() * 2)) % PALETTES.length,
      caption: caps[Math.floor(rng() * caps.length)], angle: 120 + Math.floor(rng() * 90),
    });
  }
  return photos;
}

function seedUsers() {
  const rng = seeded(20261008);
  const users = {};
  [...RAW_PROFILES, ...DROP_PROFILES].forEach((p) => {
    const today = Math.round(rng() * 60 - 18);
    const week = Math.round(today + rng() * 150 - 25);
    users[p.id] = {
      id: p.id, name: p.name, last: p.last, age: p.age, gender: GENDER_CODE[p.g], interestedIn: INTO_CODE[p.into],
      pronouns: p.pr, major: p.major, grad: p.grad, pal: p.pal, visibility: p.vis, bio: p.bio,
      prompts: p.prompts.map(([q, a]) => ({ q, a })), interests: p.interests, classes: p.classes, dorm: p.dorm,
      spots: p.spots, photos: makePhotos(p), score: p.score, scoreYesterday: p.score - today, weekGain: week,
      willLike: rng() < 0.55, order: rng(), drop: !!p.drop,
    };
  });
  return users;
}

/** Would these two people see each other in Discover? (my "show me" + their "interested in") */
function compatible(account, u) {
  const show = (SHOW_ME.find((s) => s.id === account.showMe) || SHOW_ME[2]).genders;
  return show.includes(u.gender) && u.interestedIn.includes(account.gender);
}

function passesFilters(u, f) {
  if (u.age < f.ageMin || u.age > f.ageMax) return false;
  if (f.grads.length && !f.grads.includes(u.grad)) return false;
  if (f.majors.length && !f.majors.includes(u.major)) return false;
  if (f.interests.length && !u.interests.some((i) => f.interests.includes(i))) return false;
  return true;
}

function filtersActive(f) {
  return f.ageMin !== DEFAULT_FILTERS.ageMin || f.ageMax !== DEFAULT_FILTERS.ageMax || f.grads.length > 0 || f.majors.length > 0 || f.interests.length > 0;
}

/** Discover deck: Swirl Night drops first (when live), then people who super liked you, then a stable shuffle. */
function buildDeck(state, live) {
  const a = state.account;
  if (!a) return [];
  const blocked = new Set(state.blocked);
  return Object.values(state.users)
    .filter((u) => !state.swipes[u.id] && !blocked.has(u.id) && (!u.drop || live) && compatible(a, u) && passesFilters(u, state.filters))
    .sort((x, y) => (y.drop && live) - (x.drop && live) || (state.swipedMe[y.id] === "super") - (state.swipedMe[x.id] === "super") || x.order - y.order);
}

function buildGroupDeck(state) {
  const blocked = new Set(state.blocked);
  return GROUPS.filter((g) => !state.groupSwipes[g.id] && g.members.every((m) => state.users[m] && !blocked.has(m)));
}

/** "Both in ECON 2010" — shared classes, dorm and favorite campus spots. */
function overlapTags(me, u) {
  if (!me || !u) return [];
  const tags = [];
  (u.classes || []).forEach((c) => { if ((me.classes || []).includes(c)) tags.push({ kind: "class", label: `Both in ${c}` }); });
  if (u.dorm && me.dorm === u.dorm && u.dorm !== "Off campus") {
    tags.push({ kind: "dorm", label: u.dorm === "The Hill (off campus)" ? "Both live on the Hill" : `Both in ${u.dorm}` });
  }
  (u.spots || []).forEach((s) => { if ((me.spots || []).includes(s)) tags.push({ kind: "spot", label: `Both love ${s}` }); });
  return tags;
}

/** Three date spots in three different categories, weighted toward shared interests. Skips 21+ spots for anyone under 21. */
function pickDateIdeas(me, other, seedKey) {
  const rng = seeded(hashStr(seedKey));
  const mine = new Set((me && me.interests) || []);
  const theirs = new Set((other && other.interests) || []);
  const under21 = ((me && me.age) || 21) < 21 || ((other && other.age) || 21) < 21;
  const scored = DATE_SPOTS.filter((s) => !(s.age21 && under21))
    .map((s) => ({ s, w: s.tags.reduce((acc, t) => acc + (mine.has(t) && theirs.has(t) ? 3 : mine.has(t) || theirs.has(t) ? 1 : 0), 0) + rng() * 1.6 }))
    .sort((a, b) => b.w - a.w);
  const out = [];
  const cats = new Set();
  for (const { s } of scored) {
    if (out.length === 3) break;
    if (cats.has(s.cat)) continue;
    out.push(s.id);
    cats.add(s.cat);
  }
  return out;
}

/* Swirl Night: weekly 2-hour drop, Thursdays 9–11 PM local time. */
const SWIRL_NIGHT = { weekday: 4, hour: 21, length: 2 * HOUR };

function naturalSwirlWindow(now) {
  const d = new Date(now);
  const start = new Date(d);
  start.setHours(SWIRL_NIGHT.hour, 0, 0, 0);
  start.setDate(start.getDate() - ((d.getDay() - SWIRL_NIGHT.weekday + 7) % 7));
  if (start.getTime() > now) start.setDate(start.getDate() - 7);
  const s = start.getTime();
  if (now < s + SWIRL_NIGHT.length) return { live: true, start: s, end: s + SWIRL_NIGHT.length };
  const next = new Date(s);
  next.setDate(next.getDate() + 7);
  return { live: false, start: next.getTime(), end: next.getTime() + SWIRL_NIGHT.length };
}

/** override: null (follow the real schedule) | "live" (simulate an event starting at overrideAt) | "off" */
function swirlNightStatus(now, override, overrideAt) {
  if (override === "live" && now < overrideAt + SWIRL_NIGHT.length) {
    return { live: true, start: overrideAt, end: overrideAt + SWIRL_NIGHT.length, simulated: true };
  }
  const w = naturalSwirlWindow(now);
  if (override === "off" && w.live) {
    const n = new Date(w.start);
    n.setDate(n.getDate() + 7);
    return { live: false, start: n.getTime(), end: n.getTime() + SWIRL_NIGHT.length };
  }
  return w;
}

function personFor(id, state) {
  if (id === "me") return state.account;
  return state.users[id] || FRIENDS_BY_ID[id] || null;
}

function buildSeedMatches(account, users, now) {
  const picks = SEED_MATCH_PREFS.map((id) => users[id]).filter((u) => u && !u.drop && compatible(account, u)).slice(0, 5);
  return picks.map((u, i) => {
    const thread = SEED_THREADS[i];
    const createdAt = now - (thread ? thread.ago : SEED_NEW_MATCH_AGES[i - SEED_THREADS.length] || HOUR);
    const messages = thread
      ? thread.msgs.map(([who, text, ago], j) => ({ id: `seed_${u.id}_${j}`, from: who === "me" ? "me" : u.id, text, ts: now - ago, status: "sent" }))
      : [];
    const last = messages[messages.length - 1];
    return {
      id: `m_${u.id}`, kind: "solo", userIds: [u.id], friendIds: [], name: null, createdAt, messages,
      unread: last && last.from !== "me" ? 1 : 0, replyBonus: messages.some((m) => m.from === "me"),
      date: { me: false, them: false, done: false }, ideas: pickDateIdeas(account, u, `m_${u.id}`),
      lastActivity: last ? last.ts : createdAt,
    };
  });
}

function seedActivity(now) {
  return [
    { id: "a1", kind: "like", delta: 12, fromTier: "platinum", ts: now - 25 * MIN },
    { id: "a2", kind: "super", delta: 27, fromTier: "gold", ts: now - 2 * HOUR },
    { id: "a3", kind: "like", delta: 9, fromTier: "silver", ts: now - 3 * HOUR },
    { id: "a4", kind: "like", delta: 14, fromTier: "diamond", ts: now - 5 * HOUR },
    { id: "a5", kind: "reply", delta: 5, ts: now - 20 * HOUR },
  ];
}

function demoMy(now) {
  const today = startOfDay(now);
  const n = DEMO_HISTORY.length;
  const score = DEMO_HISTORY[n - 1];
  return {
    score, yesterday: DEMO_HISTORY[n - 2], weekGain: score - DEMO_HISTORY[n - 8],
    history: DEMO_HISTORY.slice(0, -1).map((s, i) => ({ t: today - (n - 1 - i) * DAY, s })),
    stats: { ...DEMO_STATS }, activity: seedActivity(now), peakRank: null, peakAt: null,
    topTier: tierFor(Math.max(...DEMO_HISTORY)).id, joinedAt: now - 44 * DAY,
  };
}

function freshMy(now) {
  return {
    score: SCORING.START, yesterday: SCORING.START, weekGain: 0, history: [], stats: emptyStats(), activity: [],
    peakRank: null, peakAt: null, topTier: tierFor(SCORING.START).id, joinedAt: now,
  };
}

/** Dev tool: simulate the last 13 days of incoming swipes so the trend chart has data. */
function backfillTwoWeeks(my, now) {
  const today = startOfDay(now);
  const stats = emptyStats();
  let s = SCORING.START;
  const history = [];
  const swipe = (kind) => {
    const ns = applyDelta(s, swipeDelta(kind, rand(850, 1650), s));
    const d = ns - s;
    if (kind === "like") { stats.likes++; stats.likePts += d; }
    else if (kind === "super") { stats.supers++; stats.superPts += d; }
    else { stats.passes++; stats.passPts += d; }
    s = ns;
  };
  for (let day = 13; day >= 1; day--) {
    const likes = randInt(5, 11);
    const passes = randInt(8, 16);
    for (let i = 0; i < likes; i++) swipe("like");
    if (Math.random() < 0.3) swipe("super");
    for (let i = 0; i < passes; i++) swipe("pass");
    history.push({ t: today - day * DAY, s });
  }
  const todayDelta = my.score - my.yesterday;
  const score = applyDelta(s, todayDelta);
  const merged = { ...stats };
  Object.keys(merged).forEach((k) => { merged[k] += my.stats[k] || 0; });
  const best = Math.max(score, ...history.map((h) => h.s));
  const topTier = TIER_INDEX[tierFor(best).id] > TIER_INDEX[my.topTier] ? tierFor(best).id : my.topTier;
  return { ...my, score, yesterday: s, history, stats: merged, weekGain: score - history[history.length - 7].s, joinedAt: now - 14 * DAY, topTier };
}

/** Who swipes on you next. 70% from real profiles you haven't heard from; the rest from elsewhere on campus. */
function decideIncoming(state, live) {
  const a = state.account;
  const blocked = new Set(state.blocked);
  const pool = Object.values(state.users).filter((u) => !blocked.has(u.id) && !state.swipedMe[u.id] && u.interestedIn.includes(a.gender) && (!u.drop || live));
  if (pool.length && Math.random() < 0.7) {
    const from = pick(pool);
    const kind = from.willLike ? (Math.random() < 0.12 ? "super" : "like") : "pass";
    return { fromId: from.id, fromScore: from.score, kind };
  }
  const likeP = clamp(0.6 - (state.my.score - SCORING.START) / 1400, 0.24, 0.6);
  const r = Math.random();
  return { fromId: null, fromScore: Math.round(rand(820, 1650)), kind: r < likeP ? "like" : r < likeP + 0.05 ? "super" : "pass" };
}

/** Background campus activity so the leaderboard keeps moving. */
function worldEvents(state) {
  const ids = Object.keys(state.users);
  const events = [];
  for (let i = 0; i < 2; i++) {
    const to = pick(ids);
    let from = pick(ids);
    if (from === to) from = ids[(ids.indexOf(to) + 1) % ids.length];
    const r = Math.random();
    events.push({ from, to, kind: r < 0.6 ? "like" : r < 0.67 ? "super" : "pass" });
  }
  return {
    events,
    rivalry: {
      cu: { swipes: randInt(4, 14), matches: Math.random() < 0.3 ? 1 : 0, dates: Math.random() < 0.05 ? 1 : 0 },
      csu: { swipes: randInt(3, 13), matches: Math.random() < 0.28 ? 1 : 0, dates: Math.random() < 0.05 ? 1 : 0 },
      du: { swipes: randInt(1, 7), matches: Math.random() < 0.14 ? 1 : 0, dates: Math.random() < 0.03 ? 1 : 0 },
    },
  };
}

function topMatchInterest(state) {
  const counts = {};
  let total = 0;
  state.matches.filter((m) => m.kind === "solo").forEach((m) => {
    const u = state.users[m.userIds[0]];
    if (!u) return;
    total++;
    u.interests.forEach((i) => { counts[i] = (counts[i] || 0) + 1; });
  });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best ? { interest: best[0], count: best[1], total } : null;
}

/** Season recap numbers — "so far" for the live season, or the archived snapshot after a reset. */
function recapFor(state, myRank) {
  const s = state.my.stats;
  return {
    label: seasonLabel(state.season.number), likes: s.likes + s.supers, supers: s.supers,
    peakRank: state.my.peakRank || myRank, peakAt: state.my.peakAt, topTier: state.my.topTier,
    top: topMatchInterest(state), matches: state.matches.length, dates: s.dates, score: state.my.score, rank: myRank, final: false,
  };
}

/* Chat replies — keyword rules with variety, so conversations feel alive. */
const REPLY_RULES = [
  { test: /\b(hi|hey|heyy+|hello|yo|hiya)\b/i, replies: ["Heyy! Okay I was hoping you'd message first 😊", "Hi! How's your week going?", "Hey hey. What's the best thing that happened to you today?"] },
  { test: /coffee|latte|espresso|chai|matcha/i, replies: ["I'm always down for coffee ☕", "Coffee date? I know a spot on the Hill", "Only if you let me judge your order"] },
  { test: /hike|hiking|chautauqua|flagstaff|royal arch|trail|sanitas/i, replies: ["Only if you can keep up 😤", "Sunrise hike would be elite. Saturday?", "Yes!! Royal Arch or something chill?"] },
  { test: /study|norlin|exam|midterm|class|homework|problem set|lecture/i, replies: ["Midterms are honestly winning right now", "Study date counts as a date, right?", "Norlin third floor. I'll save you a seat"] },
  { test: /swirl night/i, replies: ["See you at Swirl Night then 👀", "Swirl Night is chaos and I love it"] },
  { test: /show|concert|fox|music|band|playlist|song/i, replies: ["Okay what are you listening to right now?", "I'm so in. Send me the lineup", "Fox Theatre shows hit different"] },
  { test: /date|this week|weekend|saturday|friday|sunday|tonight|tomorrow|thursday/i, replies: ["I'm free Thursday after 6?", "Yes! Let's do it", "This weekend works. What did you have in mind?"] },
  { test: /\?\s*$/, replies: ["Hmm good question. Honestly, yes", "Depends who's asking 😌", "Okay, you go first"] },
];
const GENERIC_REPLIES = ["Haha okay that's fair", "Wait, you're into {interest} too?", "Tell me more 👀", "Okay I like your energy", "That's so real", "Stop, that's literally me", "What are you up to this weekend?"];
const GROUP_REPLIES = ["Okay the group chat voted and it's a yes", "We're so in", "Saturday works for all of us?", "Our group has been waiting for this 😂", "Who's picking the spot?"];
const OPENERS = ["Hi! Okay, your profile made me smile", "Heyy, we matched! What's your go-to campus spot?", "Hi 👋 I feel like I've seen you at Norlin", "Okay, best date spot in Boulder. Go."];

function craftReply(text, partner, match, state) {
  const recent = new Set(match.messages.slice(-10).map((m) => m.text));
  recent.add(text);
  const t = text.toLowerCase();
  const spot = DATE_SPOTS.find((s) => t.includes(s.name.toLowerCase().replace(/^the /, "")));
  let options;
  if (spot) options = [`Omg yes, ${spot.name} is perfect. Thursday after 6?`, `${spot.name}? You have taste. I'm in`, `Okay ${spot.name} works. Saturday?`];
  else if (match.kind === "group" && Math.random() < 0.45) options = GROUP_REPLIES;
  else {
    const rule = REPLY_RULES.find((r) => r.test.test(text));
    options = rule ? rule.replies : GENERIC_REPLIES;
  }
  const mine = (state.account && state.account.interests) || [];
  const shared = ((partner && partner.interests) || []).filter((i) => mine.includes(i));
  const interest = (shared[0] || (partner && partner.interests && partner.interests[0]) || "coffee").toLowerCase();
  const filled = options.map((o) => o.replace("{interest}", interest));
  const fresh = filled.filter((o) => !recent.has(o));
  return pick(fresh.length ? fresh : filled);
}

/* ============================ 7. UI PRIMITIVES ============================ */

/* Layers (sheets, dialogs, full profiles) render into the phone screen so they cover the tab bar. */
const LayerContext = createContext(null);
function Layer({ children }) {
  const el = useContext(LayerContext);
  return el ? createPortal(children, el) : children;
}


/** Default to `relative` unless the caller positions the element itself (Tailwind's .relative would override .absolute). */
const posCls = (className) => (/(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className || "") ? "" : "relative");

/** Shared SVG gradients (brand + tier badges), referenced by id. */
function GradientDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <linearGradient id="sw-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B2EFF" />
          <stop offset="1" stopColor="#FF3D8B" />
        </linearGradient>
        <linearGradient id="sw-brand-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5B2EFF" />
          <stop offset="1" stopColor="#FF3D8B" />
        </linearGradient>
        <linearGradient id="sw-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF3D8B" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5B2EFF" stopOpacity="0" />
        </linearGradient>
        {TIERS.map((t) => (
          <linearGradient key={t.id} id={`sw-tier-${t.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={t.from} />
            {t.id === "diamond" && <stop offset="0.55" stopColor="#C38BFF" />}
            <stop offset="1" stopColor={t.id === "diamond" ? "#FF8FCF" : t.to} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

/* The swirl glyph: an Archimedean spiral, precomputed once. */
const SPIRAL = (() => {
  const pts = [];
  const turns = 3.2 * Math.PI;
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * turns;
    const r = 1.8 + (t / turns) * 19.2;
    pts.push([24 + r * Math.cos(t + Math.PI), 24 + r * Math.sin(t + Math.PI)]);
  }
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return { d: `M${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L")}`, len: Math.ceil(len) };
})();

function SwirlGlyph({ size = 28, stroke = 5, className = "", draw = false, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d={SPIRAL.d} fill="none" stroke={color || "url(#sw-brand)"} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
        className={draw ? "sw-draw" : undefined}
        style={draw ? { strokeDasharray: SPIRAL.len, "--len": SPIRAL.len } : undefined}
      />
    </svg>
  );
}

function Wordmark({ size = 26, className = "" }) {
  return (
    <div className={cx("flex items-center gap-1.5", className)} role="img" aria-label="Swirl">
      <SwirlGlyph size={Math.round(size * 1.08)} stroke={5.5} />
      <span className="sw-display font-extrabold leading-none" style={{ fontSize: size }}>swirl</span>
    </div>
  );
}

/* Illustrated photo motifs (viewBox 0 0 100 100). */
function Motif({ kind, c2 }) {
  const W = "rgba(255,255,255,0.94)";
  const S = "rgba(255,255,255,0.55)";
  const D = "rgba(0,0,0,0.16)";
  switch (kind) {
    case "mountain":
      return (
        <g>
          <circle cx="72" cy="27" r="9" fill={W} />
          <path d="M2 88 L36 40 L50 58 L64 42 L98 88 Z" fill={S} />
          <path d="M36 40 L44 50.3 L39.5 47.6 L35 51.5 L30.5 47.8 Z" fill={W} />
          <path d="M64 42 L71 51.5 L66.8 49 L62.5 52.4 L58.5 48.3 Z" fill={W} />
        </g>
      );
    case "snow":
      return (
        <g>
          <path d="M0 90 L30 50 L44 66 L62 38 L100 90 Z" fill={S} />
          <path d="M62 38 L70.5 49.6 L66 47.2 L61.5 51 L56.2 47 Z" fill={W} />
          <path d="M30 50 L36 56.9 L32.5 55.2 L29 58 L24.6 57.2 Z" fill={W} />
          {[[18, 20, 2.4], [40, 12, 2], [80, 18, 2.6], [90, 42, 2], [10, 44, 1.8], [52, 26, 1.6]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={W} />
          ))}
        </g>
      );
    case "coffee":
      return (
        <g>
          <path d="M38 16 q6 6 0 12 q-6 6 0 12" fill="none" stroke={S} strokeWidth="4" strokeLinecap="round" />
          <path d="M53 14 q6 6 0 12 q-6 6 0 12" fill="none" stroke={S} strokeWidth="4" strokeLinecap="round" />
          <path d="M26 44 H66 V62 A18 18 0 0 1 48 80 H44 A18 18 0 0 1 26 62 Z" fill={W} />
          <path d="M66 50 H71 A9 9 0 0 1 71 68 H65" fill="none" stroke={W} strokeWidth="5" strokeLinecap="round" />
          <path d="M31 52 H61" stroke={D} strokeWidth="3" strokeLinecap="round" />
          <rect x="18" y="84" width="60" height="5" rx="2.5" fill={S} />
        </g>
      );
    case "music":
      return (
        <g>
          <circle cx="46" cy="54" r="34" fill={W} />
          <circle cx="46" cy="54" r="26" fill="none" stroke={D} strokeWidth="1.5" />
          <circle cx="46" cy="54" r="19" fill="none" stroke={D} strokeWidth="1.5" />
          <circle cx="46" cy="54" r="10" fill={c2} />
          <circle cx="46" cy="54" r="2.5" fill={W} />
          <path d="M88 12 L74 46" stroke={W} strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="12" r="5" fill={W} />
        </g>
      );
    case "book":
      return (
        <g>
          <path d="M50 30 C40 23 25 23 14 28 V80 C25 75 40 75 50 82 Z" fill={W} />
          <path d="M50 30 C60 23 75 23 86 28 V80 C75 75 60 75 50 82 Z" fill={S} />
          <path d="M22 41 C30 38 38 38 44 41 M22 51 C30 48 38 48 44 51 M22 61 C30 58 38 58 44 61" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "paw":
      return (
        <g fill={W}>
          <ellipse cx="50" cy="64" rx="18" ry="15" />
          <ellipse cx="28" cy="44" rx="7.5" ry="9.5" />
          <ellipse cx="42" cy="31" rx="7.5" ry="9.5" />
          <ellipse cx="58" cy="31" rx="7.5" ry="9.5" />
          <ellipse cx="72" cy="44" rx="7.5" ry="9.5" />
        </g>
      );
    case "camera":
      return (
        <g>
          <rect x="34" y="25" width="20" height="12" rx="3" fill={W} />
          <rect x="16" y="34" width="68" height="46" rx="9" fill={W} />
          <circle cx="50" cy="57" r="15" fill={c2} />
          <circle cx="50" cy="57" r="8" fill={S} />
          <circle cx="73" cy="44" r="3" fill={D} />
        </g>
      );
    case "night":
      return (
        <g>
          <circle cx="74" cy="24" r="10" fill={W} />
          {[[16, 16, 1.8], [30, 30, 1.4], [46, 12, 2], [58, 30, 1.3], [92, 40, 1.6], [10, 44, 1.4]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={W} />
          ))}
          <path d="M0 92 V64 H10 V54 H20 V68 H28 V44 H42 V60 H50 V50 H62 V70 H70 V56 H84 V66 H100 V92 Z" fill={S} />
          {[[32, 50], [36, 56], [53, 56], [74, 62], [13, 60]].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill={W} />
          ))}
        </g>
      );
    case "sun":
      return (
        <g>
          <circle cx="50" cy="42" r="15" fill={W} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <path key={i} d={`M${50 + Math.cos(a) * 21} ${42 + Math.sin(a) * 21} L${50 + Math.cos(a) * 29} ${42 + Math.sin(a) * 29}`} stroke={W} strokeWidth="4" strokeLinecap="round" />;
          })}
          <path d="M0 80 Q25 72 50 80 T100 80 V100 H0 Z" fill={S} />
        </g>
      );
    case "wave":
      return (
        <g>
          <circle cx="70" cy="28" r="10" fill={W} />
          <path d="M0 60 Q12.5 50 25 60 T50 60 T75 60 T100 60 V100 H0 Z" fill={S} />
          <path d="M0 74 Q12.5 64 25 74 T50 74 T75 74 T100 74 V100 H0 Z" fill={W} />
        </g>
      );
    case "ball":
      return (
        <g>
          <circle cx="50" cy="52" r="30" fill={W} />
          <path d="M20 52 H80 M50 22 V82" stroke={D} strokeWidth="2.5" />
          <path d="M29 31 Q42 52 29 73 M71 31 Q58 52 71 73" fill="none" stroke={D} strokeWidth="2.5" />
        </g>
      );
    case "leaf":
      return (
        <g>
          <path d="M50 88 C18 72 18 34 50 12 C82 34 82 72 50 88 Z" fill={W} />
          <path d="M50 86 V26 M50 50 L36 38 M50 62 L64 50 M50 72 L38 62" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

/** A profile "photo": an uploaded image, or a gradient placeholder (monogram or illustrated motif). */
function PhotoArt({ photo, person, className = "", mono = 96, showCaption = true, style }) {
  if (photo && photo.kind === "upload") {
    return (
      <div className={cx(posCls(className), "overflow-hidden", className)} style={style}>
        <img src={photo.url} alt={person ? `Photo of ${person.name}` : ""} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      </div>
    );
  }
  const [c1, c2] = PALETTES[((photo && photo.pal) || 0) % PALETTES.length];
  const angle = (photo && photo.angle) || 155;
  const motif = (photo && photo.motif) || "portrait";
  return (
    <div
      className={cx(posCls(className), "overflow-hidden", className)}
      style={{ background: `radial-gradient(120% 90% at 18% 8%, rgba(255,255,255,.30), rgba(255,255,255,0) 55%), linear-gradient(${angle}deg, ${c1}, ${c2})`, ...style }}
      role="img" aria-label={person ? `${person.name}'s photo` : "Photo"}
    >
      {motif === "portrait" ? (
        <>
          <svg viewBox="0 0 48 48" className="absolute" style={{ right: "-24%", bottom: "-22%", width: "96%", height: "auto" }} aria-hidden="true">
            <path d={SPIRAL.d} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="sw-display font-extrabold text-white leading-none" style={{ fontSize: mono, textShadow: "0 6px 30px rgba(0,0,0,.18)" }}>{initials(person)}</span>
          </div>
        </>
      ) : (
        <svg viewBox="0 0 100 100" className="absolute" style={{ left: "14%", top: "14%", width: "72%", height: "66%" }} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <Motif kind={motif} c2={c2} />
        </svg>
      )}
      {showCaption && photo && photo.caption && (
        <span className="absolute left-3 bottom-3 sw-glass rounded-full px-2.5 py-1 text-xs font-semibold">{photo.caption}</span>
      )}
    </div>
  );
}

function Avatar({ person, size = 40, ring = false, className = "" }) {
  const photo = (person && person.photos && person.photos[0]) || { kind: "art", pal: (person && person.pal) || 0, motif: "portrait" };
  const pal = PALETTES[(photo.pal || 0) % PALETTES.length];
  const inner = photo.kind === "upload" ? (
    <img src={photo.url} alt="" className="w-full h-full object-cover" draggable={false} />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-white sw-display font-bold" style={{ background: `linear-gradient(150deg, ${pal[0]}, ${pal[1]})`, fontSize: Math.max(10, Math.round(size * 0.36)) }}>
      {initials(person)}
    </div>
  );
  return (
    <div className={cx("shrink-0 rounded-full", ring && "sw-grad", className)} style={{ width: size, height: size, padding: ring ? 2 : 0 }}>
      <div className="w-full h-full rounded-full overflow-hidden" style={ring ? { border: "2px solid var(--bg)" } : undefined}>{inner}</div>
    </div>
  );
}

function TierShape({ tier, size = 16 }) {
  const common = { fill: `url(#sw-tier-${tier.id})`, stroke: "rgba(0,0,0,.22)", strokeWidth: 0.8 };
  let shape;
  if (tier.shape === "medal") {
    shape = (
      <>
        <circle cx="10" cy="10.5" r="7.6" {...common} />
        <circle cx="10" cy="10.5" r="4.2" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.2" />
      </>
    );
  } else if (tier.shape === "shield") {
    shape = <path d="M10 1.8 L17 4.6 V10 C17 14.2 14 17 10 18.6 C6 17 3 14.2 3 10 V4.6 Z" {...common} />;
  } else if (tier.shape === "star") {
    shape = <path d="M10 1.6 L12.6 7.1 L18.5 7.8 L14 11.8 L15.3 17.6 L10 14.6 L4.7 17.6 L6 11.8 L1.5 7.8 L7.4 7.1 Z" {...common} />;
  } else if (tier.shape === "hex") {
    shape = (
      <>
        <path d="M10 1.6 L17.3 5.8 V14.2 L10 18.4 L2.7 14.2 V5.8 Z" {...common} />
        <path d="M10 5.6 L13.8 7.8 V12.2 L10 14.4 L6.2 12.2 V7.8 Z" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="1" />
      </>
    );
  } else {
    shape = (
      <>
        <path d="M5.4 2.8 H14.6 L18.6 7.9 L10 18.2 L1.4 7.9 Z" {...common} />
        <path d="M1.4 7.9 H18.6 M7 2.8 L5.7 7.9 L10 18.2 L14.3 7.9 L13 2.8" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth=".9" />
      </>
    );
  }
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">{shape}</svg>;
}

/** Tier badge. tone: surface (app chrome) | glass (on photos) | card (on white cards) */
function TierBadge({ score, tierId, tone = "surface", size = "sm", label = true, className = "" }) {
  const tier = tierId ? TIERS[TIER_INDEX[tierId]] : tierFor(score);
  const toneCls = tone === "glass" ? "sw-glass" : tone === "card" ? "" : "sw-surface-2 sw-text";
  const toneStyle = tone === "card" ? { background: "rgba(21,16,31,.06)", color: "var(--card-text)" } : undefined;
  const sizes = { sm: "pl-1 pr-2 py-0.5 text-xs gap-1", md: "pl-1.5 pr-2.5 py-1 text-sm gap-1.5" };
  return (
    <span className={cx("inline-flex items-center rounded-full font-bold whitespace-nowrap", label ? sizes[size] : "p-0.5", toneCls, className)} style={toneStyle} title={`${tier.name} tier`}>
      <TierShape tier={tier} size={size === "md" ? 18 : 15} />
      {label && tier.name}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", className = "", disabled, type = "button", icon: Icon, style, ...rest }) {
  const sizes = { sm: "h-9 px-3.5 text-sm", md: "h-11 px-5 text-sm", lg: "h-14 px-6 text-base" };
  const variants = {
    primary: "sw-grad shadow-lg",
    secondary: "sw-surface-2 sw-text",
    ghost: "sw-text",
    outline: "border sw-border sw-text",
    danger: "text-white",
    white: "bg-white",
  };
  const vStyle = variant === "danger" ? { background: "var(--down)" } : variant === "white" ? { color: "#15101F" } : undefined;
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={cx("inline-flex items-center justify-center gap-2 font-semibold rounded-full transition active:scale-95 disabled:opacity-40 whitespace-nowrap", sizes[size], variants[variant], className)}
      style={{ ...vStyle, ...style }} {...rest}
    >
      {Icon && <Icon size={size === "sm" ? 15 : 18} className="shrink-0" />}
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, children, className = "", variant = "surface", size = 40, dot = false, disabled }) {
  const v = variant === "surface" ? "sw-surface-2 sw-text" : variant === "glass" ? "sw-glass" : variant === "plain" ? "sw-text" : variant;
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={cx(posCls(className), "inline-flex items-center justify-center rounded-full transition active:scale-90 shrink-0 disabled:opacity-40", v, className)}
      style={{ width: size, height: size }}>
      {children}
      {dot ? <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full" style={{ background: "var(--pink)", boxShadow: "0 0 0 2px var(--bg)" }} /> : null}
    </button>
  );
}

function Chip({ selected, onClick, children, icon: Icon, className = "", disabled, small }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={!!selected}
      className={cx("inline-flex items-center gap-1.5 rounded-full font-semibold transition active:scale-95", small ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm", selected ? "sw-grad" : "sw-surface-2 sw-text", disabled && !selected && "opacity-40", className)}>
      {Icon && <Icon size={small ? 13 : 15} className="shrink-0" />}
      {children}
      {selected && <Check size={small ? 12 : 14} className="shrink-0" />}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition border", checked ? "sw-grad border-transparent" : "sw-surface-2 sw-border")}>
      <span className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: `translateX(${checked ? 23 : 3}px)` }} />
    </button>
  );
}

function Segmented({ options, value, onChange, size = "md", className = "", label }) {
  return (
    <div className={cx("flex p-1 rounded-full sw-surface-2", className)} role="tablist" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
            className={cx("flex-1 flex items-center justify-center gap-1.5 rounded-full font-semibold transition whitespace-nowrap", size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm", value === o.id ? "sw-grad shadow" : "sw-muted")}>
            {Icon && <Icon size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Sheet({ open, onClose, title, children, footer, full = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && onClose) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <Layer>
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 sw-anim-fade" onClick={onClose} />
      <div className="relative sw-app rounded-t-3xl sw-anim-sheet flex flex-col min-h-0" style={{ maxHeight: full ? "96%" : "88%", height: full ? "96%" : undefined }}>
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="h-1 w-10 rounded-full" style={{ background: "var(--faint)", opacity: 0.5 }} />
        </div>
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-3 shrink-0">
            <h2 className="sw-display text-xl font-bold">{title}</h2>
            <IconBtn label="Close" onClick={onClose} size={36}><X size={18} /></IconBtn>
          </div>
        )}
        <div className="sw-scroll flex-1 min-h-0 px-5 pb-5">{children}</div>
        {footer && <div className="px-5 pt-3 pb-5 border-t sw-border shrink-0">{footer}</div>}
      </div>
    </div>
    </Layer>
  );
}

function Dialog({ open, title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel, children, confirmDisabled }) {
  if (!open) return null;
  return (
    <Layer>
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 sw-anim-fade" onClick={onCancel} />
      <div className="relative w-full rounded-3xl sw-surface p-5 sw-anim-pop" style={{ maxWidth: 340 }}>
        <h2 className="sw-display text-xl font-bold sw-balance">{title}</h2>
        {body && <p className="mt-2 text-sm sw-muted leading-relaxed">{body}</p>}
        {children}
        <div className="mt-5 flex gap-2">
          <Btn variant="secondary" className="flex-1" onClick={onCancel}>{cancelLabel}</Btn>
          <Btn variant={tone === "danger" ? "danger" : "primary"} className="flex-1" onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
    </Layer>
  );
}

function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <div className="flex items-center gap-1 px-2 h-14 shrink-0">
      {onBack && <IconBtn label="Back" onClick={onBack} variant="plain"><ChevronLeft size={26} /></IconBtn>}
      <div className={cx("flex-1 min-w-0", !onBack && "pl-3")}>
        <h1 className="sw-display text-xl font-bold truncate leading-tight">{title}</h1>
        {subtitle && <p className="text-xs sw-muted truncate">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const Skeleton = ({ className = "", style }) => <div className={cx("sw-skeleton rounded-xl", className)} style={style} />;

function EmptyState({ icon: Icon = Sparkles, title, body, action, tone = "soft" }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-10 sw-anim-rise">
      <div className={cx("h-16 w-16 rounded-full flex items-center justify-center mb-4", tone === "error" ? "" : "sw-soft")} style={tone === "error" ? { background: "rgba(255,92,115,.14)", color: "var(--down)" } : undefined}>
        <Icon size={28} />
      </div>
      <h3 className="sw-display text-xl font-bold sw-balance">{title}</h3>
      {body && <p className="mt-2 text-sm sw-muted leading-relaxed sw-balance" style={{ maxWidth: 290 }}>{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

function SectionLabel({ children, right, className = "" }) {
  return (
    <div className={cx("flex items-center justify-between gap-3 mb-2", className)}>
      <h3 className="text-sm font-bold sw-muted">{children}</h3>
      {right}
    </div>
  );
}

function Movement({ move, className = "" }) {
  if (!move) return <span className={cx("inline-flex items-center sw-faint", className)} aria-label="No change"><Minus size={14} /></span>;
  const up = move > 0;
  return (
    <span className={cx("inline-flex items-center gap-0.5 text-xs font-bold sw-num", up ? "sw-up" : "sw-down", className)} aria-label={`${up ? "Up" : "Down"} ${Math.abs(move)}`}>
      {up ? <ArrowUp size={13} strokeWidth={3} /> : <ArrowDown size={13} strokeWidth={3} />}
      {Math.abs(move)}
    </span>
  );
}

function ToastStack({ toasts, onDismiss, top = 10 }) {
  return (
    <div className="absolute left-0 right-0 z-50 px-3 flex flex-col gap-2 pointer-events-none" style={{ top }} aria-live="polite">
      {toasts.slice(-2).map((t) => {
        const Icon = t.icon || Sparkles;
        return (
          <div key={t.id} className="pointer-events-auto sw-anim-toast rounded-2xl pl-3 pr-2 py-2.5 flex items-center gap-3 sw-card" role="status">
            <div className={cx("h-9 w-9 shrink-0 rounded-full flex items-center justify-center", t.tone === "danger" ? "text-white" : "sw-grad")} style={t.tone === "danger" ? { background: "var(--down)" } : undefined}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">{t.title}</p>
              {t.body && <p className="text-xs sw-card-muted mt-0.5 leading-snug">{t.body}</p>}
            </div>
            {t.action && (
              <button type="button" className="text-sm font-bold px-2 h-8 rounded-full" style={{ color: "#5B2EFF" }} onClick={() => { t.action.onClick(); onDismiss(t.id); }}>
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" className="sw-card-muted p-1.5 rounded-full" onClick={() => onDismiss(t.id)}><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}

/** Score pill with a floating "+12" each time the score changes. */
function ScorePill({ score, onClick, rank }) {
  const prev = useRef(score);
  const timers = useRef([]);
  const [floats, setFloats] = useState([]);
  const [bump, setBump] = useState(0);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const d = score - prev.current;
    prev.current = score;
    if (!d) return;
    const id = uid("f");
    setFloats((f) => [...f.slice(-2), { id, d }]);
    setBump((b) => b + 1);
    timers.current.push(setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300));
  }, [score]);
  return (
    <button type="button" onClick={onClick} className="relative flex items-center gap-1.5 h-10 pl-1.5 pr-3 rounded-full sw-surface-2 active:scale-95 transition" aria-label={`Your Swirl Score is ${fmt(score)}${rank ? `, rank ${rank}` : ""}`}>
      <TierShape tier={tierFor(score)} size={22} />
      <span key={bump} className={cx("sw-display font-bold sw-num text-sm", bump && "sw-anim-bump")}>{fmt(score)}</span>
      {floats.map((f) => (
        <span key={f.id} className={cx("absolute right-1 -top-1 text-xs font-extrabold sw-anim-float sw-num pointer-events-none", f.d > 0 ? "sw-up" : "sw-down")}>{signed(f.d)}</span>
      ))}
    </button>
  );
}

function LiveDot({ className = "" }) {
  return <span className={cx("inline-block h-2 w-2 rounded-full sw-live-dot", className)} style={{ background: "#FF3D8B" }} />;
}

function Field({ label, hint, error, children, htmlFor, right }) {
  return (
    <div className="flex flex-col gap-1.5">
      {(label || right) && (
        <div className="flex items-center justify-between gap-2">
          {label && <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>}
          {right}
        </div>
      )}
      {children}
      {error ? <p className="text-xs font-semibold sw-down" role="alert">{error}</p> : hint ? <p className="text-xs sw-muted">{hint}</p> : null}
    </div>
  );
}

const inputCls = (invalid) => cx("sw-input w-full rounded-2xl px-4 h-12 text-base", invalid && "sw-invalid");

/* ===================== 8. SCREENS: SPLASH & ONBOARDING ===================== */

const EDU_RE = /^[^\s@]+@([a-z0-9-]+\.)+edu$/i;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CLASS_SINGULAR = { 2027: "Senior", 2028: "Junior", 2029: "Sophomore", 2030: "Freshman" };
const SAMPLE_MOTIFS = ["portrait", "mountain", "coffee", "music", "snow", "camera", "sun", "paw"];

const VISIBILITY = [
  { id: "public", label: "Public", Icon: Eye, body: "Your rank and Swirl Score show on the campus leaderboard." },
  { id: "tier", label: "Tier only", Icon: ShieldCheck, body: "You show on the leaderboard with your tier badge instead of your score." },
  { id: "hidden", label: "Hidden", Icon: EyeOff, body: "You're off the leaderboard, and your tier badge stays private." },
];

/** Restart a CSS shake without remounting (keeps input focus). */
function useShake() {
  const ref = useRef(null);
  const trigger = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("sw-anim-shake");
    void el.offsetWidth;
    el.classList.add("sw-anim-shake");
  }, []);
  return [ref, trigger];
}

function Splash({ onStart, onDemo, returning, onReturn, notice }) {
  return (
    <div className="relative h-full flex flex-col sw-app overflow-hidden">
      <div className="absolute rounded-full sw-swirl-bg pointer-events-none" style={{ width: 420, height: 420, left: "50%", top: "6%", marginLeft: -210 }} aria-hidden="true" />
      {notice && (
        <div className="relative z-10 mx-4 mt-4 rounded-2xl sw-surface border sw-border p-3 text-sm flex items-center gap-2 sw-anim-rise" role="status">
          <CheckCircle2 size={18} className="sw-up shrink-0" />
          {notice}
        </div>
      )}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="sw-anim-pop">
          <SwirlGlyph size={132} stroke={4.2} className="sw-anim-spin" />
        </div>
        <h1 className="sw-display font-extrabold mt-5 leading-none" style={{ fontSize: 76 }}>swirl</h1>
        <p className="sw-display text-2xl font-bold mt-3">Find your swirl.</p>
        <p className="mt-3 text-sm sw-muted leading-relaxed sw-balance" style={{ maxWidth: 290 }}>
          The college dating app where every like moves you up your campus leaderboard. Now live at CU Boulder.
        </p>
      </div>
      <div className="relative z-10 px-6 pb-8 flex flex-col gap-2.5">
        {returning ? (
          <>
            <Btn size="lg" onClick={onReturn}>Log back in as {returning.name}</Btn>
            <Btn size="lg" variant="secondary" onClick={onStart}>Create a new account</Btn>
          </>
        ) : (
          <>
            <Btn size="lg" onClick={onStart}>Get Started</Btn>
            <Btn size="lg" variant="ghost" onClick={onDemo}>Explore the demo account</Btn>
          </>
        )}
        <p className="text-center text-xs sw-faint mt-1">For college students 18 and up. You'll need a .edu email.</p>
      </div>
    </div>
  );
}

function AgeBlocked({ onBack }) {
  return (
    <div className="h-full flex flex-col sw-app">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center sw-anim-rise">
        <div className="h-16 w-16 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(255,92,115,.14)", color: "var(--down)" }}>
          <Lock size={28} />
        </div>
        <h1 className="sw-display text-3xl font-bold sw-balance">Swirl is for students 18 and older</h1>
        <p className="mt-3 text-sm sw-muted leading-relaxed sw-balance">
          We can't create an account for you. If your birthday was entered by mistake, contact Swirl support from your school email.
        </p>
        <p className="mt-6 text-xs sw-faint">Prototype note: reload the page to try again.</p>
      </div>
      <div className="p-5">
        <Btn variant="secondary" size="lg" className="w-full" onClick={onBack}>Back to start</Btn>
      </div>
    </div>
  );
}

function StepIntro({ title, body }) {
  return (
    <div className="mb-6">
      <h1 className="sw-display text-3xl font-bold leading-tight sw-balance">{title}</h1>
      {body && <p className="mt-2 text-sm sw-muted leading-relaxed">{body}</p>}
    </div>
  );
}

function CodeInput({ value, onChange, invalid, onSubmit }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative" onClick={() => ref.current && ref.current.focus()}>
      <div className="grid grid-cols-6 gap-2" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => {
          const active = focused && (i === value.length || (i === 5 && value.length === 6));
          return (
            <div key={i} className="h-14 rounded-2xl flex items-center justify-center sw-display text-2xl font-bold sw-surface-2 border-2 transition sw-num"
              style={{ borderColor: invalid ? "var(--down)" : active ? "var(--violet)" : "transparent" }}>
              {value[i] || ""}
            </div>
          );
        })}
      </div>
      <input
        ref={ref} value={value} maxLength={6} inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" autoFocus
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => { if (e.key === "Enter" && onSubmit) onSubmit(); }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="absolute inset-0 w-full h-full opacity-0"
      />
    </div>
  );
}

/* ---------- Profile form pieces (shared by onboarding and Edit profile) ---------- */

function basicsErrors(d) {
  const e = {};
  const n = (d.name || "").trim();
  if (n.length < 2) e.name = "Enter your first name (at least 2 letters).";
  else if (!/^[\p{L}][\p{L} '\-]*$/u.test(n)) e.name = "Use letters only.";
  if (!d.major) e.major = "Choose your major.";
  if (!d.grad) e.grad = "Choose your graduation year.";
  if (!d.gender) e.gender = "Choose one.";
  if (!d.showMe) e.showMe = "Choose who you want to see.";
  return e;
}

function BasicsFields({ data, set, showErrors, age }) {
  const errors = showErrors ? basicsErrors(data) : {};
  return (
    <div className="flex flex-col gap-5">
      <Field label="First name" htmlFor="pf-name" error={errors.name}>
        <input id="pf-name" value={data.name} maxLength={20} autoComplete="given-name" placeholder="Your first name"
          onChange={(e) => set({ name: e.target.value })} className={inputCls(errors.name)} />
      </Field>
      {age != null && (
        <div className="flex items-center justify-between rounded-2xl sw-surface-2 px-4 h-12">
          <span className="text-sm font-semibold">Age</span>
          <span className="text-sm sw-muted">{age}, from your birthday</span>
        </div>
      )}
      <Field label="Major" htmlFor="pf-major" error={errors.major}>
        <select id="pf-major" value={data.major} onChange={(e) => set({ major: e.target.value })} className={inputCls(errors.major)}>
          <option value="">Choose your major</option>
          {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Graduation year" error={errors.grad}>
        <div className="grid grid-cols-4 gap-2">
          {GRAD_YEARS.map((y) => (
            <button key={y} type="button" aria-pressed={data.grad === y} onClick={() => set({ grad: y })}
              className={cx("rounded-2xl py-2 flex flex-col items-center transition active:scale-95", data.grad === y ? "sw-grad" : "sw-surface-2")}>
              <span className="sw-display font-bold sw-num">{y}</span>
              <span className={cx("text-xs", data.grad === y ? "text-white" : "sw-muted")}>{CLASS_SINGULAR[y]}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Pronouns" hint="Optional. Shown on your profile.">
        <div className="flex flex-wrap gap-2">
          {PRONOUNS.map((p) => <Chip key={p} small selected={data.pronouns === p} onClick={() => set({ pronouns: data.pronouns === p ? "" : p })}>{p}</Chip>)}
        </div>
      </Field>
      <Field label="I'm a" error={errors.gender}>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => <Chip key={g.id} selected={data.gender === g.id} onClick={() => set({ gender: g.id })}>{g.label}</Chip>)}
        </div>
      </Field>
      <Field label="Show me" error={errors.showMe}>
        <div className="flex flex-wrap gap-2">
          {SHOW_ME.map((s) => <Chip key={s.id} selected={data.showMe === s.id} onClick={() => set({ showMe: s.id })}>{s.label}</Chip>)}
        </div>
      </Field>
    </div>
  );
}

function PhotoGrid({ photos, onChange, person, max = 6 }) {
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const openPicker = () => fileRef.current && fileRef.current.click();
  const addFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const room = max - photos.length;
    const images = list.filter((f) => f.type && f.type.startsWith("image/"));
    const ok = images.filter((f) => f.size <= 15 * 1024 * 1024);
    let msg = "";
    if (images.length < list.length) msg = "Some files weren't images, so they were skipped.";
    else if (ok.length < images.length) msg = "Photos need to be under 15 MB.";
    else if (ok.length > room) msg = `Only ${room} more photo${room === 1 ? "" : "s"} fit.`;
    setError(msg);
    onChange([...photos, ...ok.slice(0, room).map((f) => ({ kind: "upload", url: URL.createObjectURL(f) }))]);
  };
  const addSample = () => {
    if (photos.length >= max) return;
    const motif = photos.length === 0 ? "portrait" : SAMPLE_MOTIFS[photos.length % SAMPLE_MOTIFS.length];
    const caps = MOTIF_CAPTIONS[motif];
    onChange([...photos, { kind: "art", pal: randInt(0, PALETTES.length - 1), motif, caption: caps ? pick(caps) : undefined, angle: randInt(120, 200) }]);
    setError("");
  };
  const remove = (i) => {
    const p = photos[i];
    if (p.kind === "upload") { try { URL.revokeObjectURL(p.url); } catch (e) { /* ignore */ } }
    onChange(photos.filter((_, j) => j !== i));
  };
  const makeMain = (i) => onChange([photos[i], ...photos.filter((_, j) => j !== i)]);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: max }).map((_, i) => {
          const p = photos[i];
          if (!p) {
            return (
              <button key={i} type="button" onClick={openPicker} aria-label="Upload a photo"
                className="rounded-2xl border-2 border-dashed sw-border flex flex-col items-center justify-center gap-1 sw-muted transition active:scale-95" style={{ aspectRatio: "4 / 5" }}>
                <Plus size={22} />
                {i === photos.length && <span className="text-xs font-semibold">Add</span>}
              </button>
            );
          }
          return (
            <div key={i} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
              <PhotoArt photo={p} person={person} className="absolute inset-0" mono={30} showCaption={false} />
              {i === 0 ? (
                <span className="absolute left-1.5 bottom-1.5 sw-glass text-xs font-bold rounded-full px-2 py-0.5">Main</span>
              ) : (
                <button type="button" onClick={() => makeMain(i)} className="absolute left-1.5 bottom-1.5 sw-glass text-xs font-bold rounded-full px-2 py-0.5">Make main</button>
              )}
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(i)} className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full sw-glass flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="secondary" size="sm" icon={Upload} onClick={openPicker} disabled={photos.length >= max}>Upload photos</Btn>
        <Btn variant="secondary" size="sm" icon={Sparkles} onClick={addSample} disabled={photos.length >= max}>Add sample photo</Btn>
      </div>
      {error && <p className="mt-2 text-xs font-semibold sw-down" role="alert">{error}</p>}
    </div>
  );
}

function PromptEditor({ prompts, onChange, showErrors }) {
  const used = prompts.map((p) => p.q);
  const update = (i, patch) => onChange(prompts.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="flex flex-col gap-3">
      {prompts.map((p, i) => {
        const err = showErrors && p.a.trim().length < 2 ? "Answer this prompt." : "";
        return (
          <div key={i} className="rounded-2xl sw-surface p-3 border sw-border">
            <select aria-label={`Prompt ${i + 1}`} value={p.q} onChange={(e) => update(i, { q: Number(e.target.value) })} className="sw-input w-full rounded-xl px-3 h-10 text-sm font-semibold">
              {PROMPT_QUESTIONS.map((q, qi) => (qi === 13 ? null : <option key={qi} value={qi} disabled={used.includes(qi) && qi !== p.q}>{q}</option>))}
            </select>
            <textarea value={p.a} maxLength={150} rows={2} placeholder="Your answer" aria-label={`Answer to: ${promptText(p.q)}`}
              onChange={(e) => update(i, { a: e.target.value })} className={cx("sw-input w-full rounded-xl px-3 py-2.5 mt-2 text-sm resize-none", err && "sw-invalid")} />
            <div className="flex justify-between mt-1">
              <span className="text-xs sw-down font-semibold">{err}</span>
              <span className="text-xs sw-faint sw-num">{p.a.length}/150</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InterestPicker({ value, onChange, min = 3, max = 8 }) {
  const [hint, setHint] = useState("");
  const toggle = (i) => {
    if (value.includes(i)) { onChange(value.filter((x) => x !== i)); setHint(""); return; }
    if (value.length >= max) { setHint(`You can pick up to ${max}. Remove one to add another.`); return; }
    onChange([...value, i]);
    setHint("");
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm sw-muted">Pick {min} to {max}</p>
        <span className={cx("text-sm font-bold sw-num", value.length >= min ? "sw-grad-text" : "sw-muted")}>{value.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((i) => <Chip key={i} small selected={value.includes(i)} onClick={() => toggle(i)}>{i}</Chip>)}
      </div>
      {hint && <p className="mt-3 text-xs font-semibold sw-down" role="alert">{hint}</p>}
    </div>
  );
}

function CampusPicker({ classes, dorm, spots, onChange }) {
  const [q, setQ] = useState("");
  const shown = COURSES.filter((c) => c.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (list, item, max) => (list.includes(item) ? list.filter((x) => x !== item) : list.length >= max ? list : [...list, item]);
  return (
    <div className="flex flex-col gap-6">
      <Field label="Classes this semester" hint={`${classes.length}/6 selected`}>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 sw-faint pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" aria-label="Search courses" className={cx(inputCls(false), "pl-10 h-11 text-sm")} />
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {shown.map((c) => <Chip key={c} small selected={classes.includes(c)} onClick={() => onChange({ classes: toggle(classes, c, 6) })}>{c}</Chip>)}
          {!shown.length && <p className="text-xs sw-muted">No courses match "{q}".</p>}
        </div>
      </Field>
      <Field label="Dorm or neighborhood" htmlFor="pf-dorm">
        <select id="pf-dorm" value={dorm} onChange={(e) => onChange({ dorm: e.target.value })} className={inputCls(false)}>
          <option value="">Prefer not to say</option>
          {DORMS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Favorite campus spots" hint={`${spots.length}/4 selected`}>
        <div className="flex flex-wrap gap-2">
          {CAMPUS_SPOTS.map((s) => <Chip key={s} small selected={spots.includes(s)} onClick={() => onChange({ spots: toggle(spots, s, 4) })}>{s}</Chip>)}
        </div>
      </Field>
    </div>
  );
}

function VisibilityPicker({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Leaderboard visibility">
      {VISIBILITY.map((v) => {
        const on = value === v.id;
        const Icon = v.Icon;
        return (
          <button key={v.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(v.id)}
            className={cx("text-left rounded-2xl p-4 flex gap-3 items-start transition", on ? "sw-grad-outline" : "sw-surface border sw-border")}>
            <div className={cx("h-10 w-10 rounded-full flex items-center justify-center shrink-0", on ? "sw-grad" : "sw-surface-2")}><Icon size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold">{v.label}</p>
              <p className="text-sm sw-muted mt-0.5 leading-snug">{v.body}</p>
            </div>
            <span className={cx("mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", on ? "border-transparent sw-grad" : "sw-border")}>{on && <Check size={12} />}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Onboarding flow ---------- */

const OB_STEPS = ["email", "code", "birthday", "basics", "photos", "about", "interests", "campus", "visibility"];

function Onboarding({ offline, onCancel, onComplete, onAgeBlocked }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => ({
    email: "", code: "", birthday: { m: "", d: "", y: "" }, name: "", major: "", grad: null, pronouns: "", gender: "", showMe: "",
    photos: [], bio: "", prompts: [{ q: 0, a: "" }, { q: 2, a: "" }, { q: 4, a: "" }], interests: [], classes: [], dorm: "", spots: [], visibility: "public",
  }));
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [shakeRef, shake] = useShake();
  const scrollRef = useRef(null);
  const timers = useRef([]);
  const now = useNow(1000);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const key = OB_STEPS[step];
  const email = d.email.trim();
  const emailError = !email ? "Enter your school email." : !EDU_RE.test(email) ? "Use your school email. It needs to end in .edu." : "";
  const isCU = /(^|\.|@)colorado\.edu$/i.test(email);
  const age = useMemo(() => {
    const Y = Number(d.birthday.y), M = Number(d.birthday.m), D = Number(d.birthday.d);
    if (!Y || !M || !D || String(d.birthday.y).length !== 4 || !isRealDate(Y, M, D)) return null;
    return ageOn(Y, M, D);
  }, [d.birthday]);
  const cooldown = sent ? Math.max(0, 30 - Math.floor((now - sent.at) / 1000)) : 0;

  const go = (n) => {
    setStep(n);
    setShowErrors(false);
    setErr("");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };
  const fail = (msg) => { setErr(msg); shake(); };

  const sendCode = () => {
    setBusy(true);
    setErr("");
    later(() => {
      setBusy(false);
      if (offline) { fail("Couldn't send the code. Check your connection and try again."); return; }
      setSent({ code: String(randInt(100000, 999999)), at: Date.now() });
      setAttempts(0);
      set({ code: "" });
      go(1);
    }, 900);
  };

  const verify = () => {
    if (!sent) return;
    if (attempts >= 5) { fail("Too many tries. Send a new code."); return; }
    if (Date.now() - sent.at > 10 * MIN) { fail("This code expired. Send a new one."); return; }
    if (d.code.length < 6) { fail("Enter all 6 digits."); return; }
    if (d.code !== sent.code) {
      const used = attempts + 1;
      setAttempts(used);
      fail(used >= 5 ? "Too many tries. Send a new code." : `That code doesn't match. ${5 - used} ${5 - used === 1 ? "try" : "tries"} left.`);
      return;
    }
    setBusy(true);
    later(() => { setBusy(false); go(2); }, 600);
  };

  const finish = () => {
    setCreating(true);
    later(() => {
      onComplete({
        id: "me", name: d.name.trim(), last: "", email: email.toLowerCase(), age, birthday: { y: Number(d.birthday.y), m: Number(d.birthday.m), d: Number(d.birthday.d) },
        gender: d.gender, showMe: d.showMe, pronouns: d.pronouns || "Prefer not to say", major: d.major, grad: d.grad,
        pal: randInt(0, PALETTES.length - 1), bio: d.bio.trim(), prompts: d.prompts.map((p) => ({ q: p.q, a: p.a.trim() })),
        interests: d.interests, classes: d.classes, dorm: d.dorm || "Off campus", spots: d.spots, visibility: d.visibility, photos: d.photos,
      });
    }, 1300);
  };

  const next = () => {
    if (busy || creating) return;
    if (key === "email") {
      if (emailError) { setShowErrors(true); shake(); return; }
      sendCode();
    } else if (key === "code") {
      verify();
    } else if (key === "birthday") {
      const { m, d: dd, y } = d.birthday;
      if (!m || !dd || !y) { fail("Enter your full birthday."); return; }
      if (age == null) { fail("That date doesn't exist. Check the month and day."); return; }
      if (Number(y) < 1900 || age < 0 || age > 100) { fail("Enter your real birthday."); return; }
      if (age < 18) { onAgeBlocked(); return; }
      go(step + 1);
    } else if (key === "basics") {
      if (Object.keys(basicsErrors(d)).length) { setShowErrors(true); fail("Fill in the highlighted fields."); return; }
      go(step + 1);
    } else if (key === "photos") {
      if (d.photos.length < 2) { fail("Add at least 2 photos."); return; }
      go(step + 1);
    } else if (key === "about") {
      const bioOk = d.bio.trim().length >= 20;
      const promptsOk = d.prompts.every((p) => p.a.trim().length >= 2);
      if (!bioOk || !promptsOk) { setShowErrors(true); fail(!bioOk ? "Write a bio of at least 20 characters." : "Answer all 3 prompts."); return; }
      go(step + 1);
    } else if (key === "interests") {
      if (d.interests.length < 3) { fail("Pick at least 3 interests."); return; }
      go(step + 1);
    } else if (key === "campus") {
      go(step + 1);
    } else if (key === "visibility") {
      finish();
    }
  };

  const back = () => {
    if (step === 0) onCancel();
    else go(step - 1);
  };

  const ctaLabel = {
    email: "Send code", code: "Verify", birthday: "Continue", basics: "Continue", photos: "Continue", about: "Continue",
    interests: "Continue", campus: d.classes.length || d.dorm || d.spots.length ? "Continue" : "Skip for now", visibility: "Start swirling",
  }[key];

  const person = { name: d.name || "You", last: "" };

  let body = null;
  if (key === "email") {
    body = (
      <>
        <StepIntro title="What's your school email?" body="Swirl is only for verified college students. We'll send a 6-digit code to confirm it's you." />
        <Field label="School email" htmlFor="ob-email" error={showErrors ? emailError : ""}>
          <input id="ob-email" type="email" inputMode="email" autoComplete="email" placeholder="you@colorado.edu" value={d.email} autoFocus
            onChange={(e) => { set({ email: e.target.value }); setErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") next(); }}
            className={inputCls(showErrors && emailError)} />
        </Field>
        {!emailError && (
          <div className="mt-4 rounded-2xl sw-surface border sw-border p-3 flex items-start gap-2.5 text-sm sw-anim-rise">
            {isCU ? <CheckCircle2 size={18} className="sw-up shrink-0 mt-0.5" /> : <Info size={18} className="sw-muted shrink-0 mt-0.5" />}
            <span className="leading-snug">
              {isCU ? "CU Boulder email. You're in the right place." : "Swirl is live at CU Boulder first. In this prototype you'll join the CU Boulder pool."}
            </span>
          </div>
        )}
      </>
    );
  } else if (key === "code") {
    body = (
      <>
        <StepIntro title="Check your inbox" body={`Enter the 6-digit code we sent to ${email}.`} />
        {sent && (
          <div className="mb-5 rounded-2xl sw-surface border sw-border p-3 flex items-center gap-3 sw-anim-toast" role="status">
            <div className="h-9 w-9 rounded-xl sw-grad flex items-center justify-center shrink-0"><Mail size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sw-muted">Demo inbox, just now</p>
              <p className="text-sm font-semibold">Your Swirl code is <span className="sw-num font-bold">{sent.code}</span></p>
            </div>
            <button type="button" onClick={() => { set({ code: sent.code }); setErr(""); }} className="text-sm font-bold sw-grad-text px-1">Fill in</button>
          </div>
        )}
        <CodeInput value={d.code} onChange={(v) => { set({ code: v }); setErr(""); }} invalid={!!err} onSubmit={next} />
        <div className="flex items-center justify-between mt-4 text-sm">
          <button type="button" onClick={() => go(0)} className="sw-muted font-semibold">Change email</button>
          <button type="button" disabled={cooldown > 0 || busy} onClick={sendCode} className="font-semibold sw-grad-text disabled:opacity-50">
            {cooldown > 0 ? `Resend in 0:${String(cooldown).padStart(2, "0")}` : "Resend code"}
          </button>
        </div>
        <p className="mt-4 text-xs sw-faint">Codes expire after 10 minutes.</p>
      </>
    );
  } else if (key === "birthday") {
    const setB = (patch) => { set({ birthday: { ...d.birthday, ...patch } }); setErr(""); };
    body = (
      <>
        <StepIntro title="When's your birthday?" body="Swirl is 18+. Your age shows on your profile. Your birthday stays private." />
        <div className="grid grid-cols-3 gap-2">
          <select aria-label="Month" value={d.birthday.m} onChange={(e) => setB({ m: e.target.value })} className={cx(inputCls(!!err), "px-3")}>
            <option value="">Month</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input aria-label="Day" inputMode="numeric" placeholder="Day" maxLength={2} value={d.birthday.d}
            onChange={(e) => setB({ d: e.target.value.replace(/\D/g, "") })} className={inputCls(!!err)} />
          <input aria-label="Year" inputMode="numeric" placeholder="Year" maxLength={4} value={d.birthday.y}
            onChange={(e) => setB({ y: e.target.value.replace(/\D/g, "") })} onKeyDown={(e) => { if (e.key === "Enter") next(); }} className={inputCls(!!err)} />
        </div>
        {age != null && age >= 18 && age <= 100 && <p className="mt-4 text-sm sw-muted">You're <span className="font-bold sw-text">{age}</span>.</p>}
      </>
    );
  } else if (key === "basics") {
    body = (
      <>
        <StepIntro title="The basics" body="This is what people see first." />
        <BasicsFields data={d} set={set} showErrors={showErrors} age={age} />
      </>
    );
  } else if (key === "photos") {
    body = (
      <>
        <StepIntro title="Add your photos" body="Add 2 to 6. Your first photo is your main one. Upload your own or use sample photos for this prototype." />
        <PhotoGrid photos={d.photos} onChange={(photos) => { set({ photos }); setErr(""); }} person={person} />
      </>
    );
  } else if (key === "about") {
    const bioErr = showErrors && d.bio.trim().length < 20 ? "Write at least 20 characters." : "";
    body = (
      <>
        <StepIntro title="Tell people about you" body="A short bio and three prompts. Specific beats clever." />
        <Field label="Bio" htmlFor="ob-bio" error={bioErr} right={<span className={cx("text-xs sw-num", d.bio.length > 280 ? "sw-down font-bold" : "sw-faint")}>{d.bio.length}/300</span>}>
          <textarea id="ob-bio" rows={4} maxLength={300} value={d.bio} onChange={(e) => set({ bio: e.target.value })}
            placeholder="Sophomore, ski bum in training, will rank every burrito on the Hill…" className={cx("sw-input w-full rounded-2xl px-4 py-3 text-base resize-none", bioErr && "sw-invalid")} />
        </Field>
        <div className="mt-6">
          <SectionLabel>Prompts</SectionLabel>
          <PromptEditor prompts={d.prompts} onChange={(prompts) => set({ prompts })} showErrors={showErrors} />
        </div>
      </>
    );
  } else if (key === "interests") {
    body = (
      <>
        <StepIntro title="What are you into?" body="Shared interests help us suggest better date spots." />
        <InterestPicker value={d.interests} onChange={(interests) => { set({ interests }); setErr(""); }} />
      </>
    );
  } else if (key === "campus") {
    body = (
      <>
        <StepIntro title="Your campus" body="Optional. Shared classes, dorms, and spots show up on cards as tags like Both in ECON 2010." />
        <CampusPicker classes={d.classes} dorm={d.dorm} spots={d.spots} onChange={set} />
      </>
    );
  } else if (key === "visibility") {
    body = (
      <>
        <StepIntro title="How do you want to show up?" body="Every like moves you up the CU Boulder leaderboard. Choose what other students can see." />
        <VisibilityPicker value={d.visibility} onChange={(visibility) => set({ visibility })} />
        <div className="mt-4 rounded-2xl sw-surface-2 p-3.5 flex gap-2.5 text-sm">
          <Lock size={16} className="shrink-0 mt-0.5 sw-muted" />
          <p className="sw-muted leading-snug">Nobody ever sees how many passes you get. You can change this anytime in Settings.</p>
        </div>
      </>
    );
  }

  return (
    <div className="relative h-full flex flex-col sw-app">
      <div className="px-2 pt-2 shrink-0">
        <div className="flex items-center gap-2">
          <IconBtn label={step === 0 ? "Back to start" : "Back"} onClick={back} variant="plain"><ChevronLeft size={26} /></IconBtn>
          <div className="flex-1 flex gap-1" aria-hidden="true">
            {OB_STEPS.map((s, i) => (
              <span key={s} className={cx("h-1.5 flex-1 rounded-full", i <= step ? "sw-grad" : "sw-surface-2")} />
            ))}
          </div>
          <span className="text-xs font-semibold sw-muted sw-num w-12 text-right pr-2">{step + 1} of {OB_STEPS.length}</span>
        </div>
      </div>
      <div ref={scrollRef} className="sw-scroll flex-1 min-h-0 px-6 pt-6 pb-6">
        <div key={key} className="sw-anim-rise">{body}</div>
      </div>
      <div className="px-6 pt-2 pb-6 shrink-0">
        <div ref={shakeRef}>
          {err && <p className="text-sm font-semibold sw-down mb-2 text-center" role="alert">{err}</p>}
          <Btn size="lg" className="w-full" onClick={next} disabled={busy || creating}>
            {busy ? <Loader2 size={20} className="sw-anim-spin-fast" /> : ctaLabel}
          </Btn>
        </div>
      </div>
      {creating && (
        <div className="absolute inset-0 z-20 sw-app flex flex-col items-center justify-center gap-5 sw-anim-fade" role="status">
          <SwirlGlyph size={84} stroke={4.5} className="sw-anim-spin-fast" />
          <p className="sw-display text-xl font-bold">Setting up your profile…</p>
          <p className="text-sm sw-muted">Starting you at 1,000 points</p>
        </div>
      )}
    </div>
  );
}

/* ============ 9. SCREENS: DISCOVER, PROFILE DETAIL, FILTERS, GROUPS ============ */

const clamp2 = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };
const TAG_ICONS = { class: GraduationCap, dorm: Home, spot: MapPin };
const classOf = (grad) => `class of ’${String(grad).slice(-2)}`;
const showPronouns = (p) => p && p !== "Prefer not to say";

function OverlapTag({ tag, onCard = false, small = false }) {
  const Icon = TAG_ICONS[tag.kind] || Sparkles;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap", small ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs", onCard ? "sw-grad-outline-card" : "sw-grad-outline")}
      style={onCard ? { color: "#15101F" } : undefined}>
      <Icon size={12} />
      {tag.label}
    </span>
  );
}

function Stamp({ label, opacity, tone, rotate, style }) {
  const bg = tone === "like" ? "var(--grad)" : tone === "super" ? "linear-gradient(135deg,#FF8A5B,#FF3D8B)" : "#15101F";
  return (
    <div className="absolute z-10 pointer-events-none rounded-2xl px-4 py-1.5 sw-display text-3xl font-extrabold text-white"
      style={{ opacity, transform: `rotate(${rotate}deg)`, background: bg, boxShadow: "0 10px 30px rgba(0,0,0,.25)", ...style }}>
      {label}
    </div>
  );
}

/** The white "polaroid" profile card face. Used in the deck and the My Profile preview. */
function CardFace({ person, me, superLiked = false, onOpen, interactive = true, compact = false }) {
  const [idx, setIdx] = useState(0);
  const photos = person.photos && person.photos.length ? person.photos : [{ kind: "art", pal: person.pal || 0, motif: "portrait" }];
  const photo = photos[Math.min(idx, photos.length - 1)];
  const tags = overlapTags(me, person);
  const showTier = person.visibility !== "hidden";
  const step = (d) => setIdx((i) => clamp(i + d, 0, photos.length - 1));
  return (
    <div className="absolute inset-0 rounded-3xl sw-card p-2.5 flex flex-col">
      <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden">
        <PhotoArt photo={photo} person={person} className="absolute inset-0" mono={compact ? 72 : 112} />
        {photos.length > 1 && (
          <div className="absolute top-2 left-3 right-3 flex gap-1 pointer-events-none">
            {photos.map((_, i) => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: i === idx ? "#fff" : "rgba(255,255,255,.42)" }} />)}
          </div>
        )}
        {interactive && photos.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" className="absolute left-0 top-0 bottom-0 w-1/2" onClick={() => step(-1)} />
            <button type="button" aria-label="Next photo" className="absolute right-0 top-0 bottom-0 w-1/2" onClick={() => step(1)} />
          </>
        )}
        <div className="absolute top-5 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
          {showTier && <TierBadge score={person.score} tone="glass" />}
          {superLiked && <span className="inline-flex items-center gap-1 rounded-full sw-grad px-2 py-0.5 text-xs font-bold"><Star size={12} fill="#fff" strokeWidth={0} />Super liked you</span>}
          {person.drop && <span className="inline-flex items-center gap-1 rounded-full sw-glass px-2 py-0.5 text-xs font-bold"><Moon size={12} />Swirl Night</span>}
        </div>
      </div>
      <button type="button" onClick={onOpen} disabled={!onOpen} className="text-left px-2 pt-3 pb-1 disabled:cursor-default" aria-label={`Open ${person.name}'s full profile`}>
        <div className="flex items-baseline gap-2">
          <h2 className={cx("sw-display font-extrabold leading-none truncate", compact ? "text-2xl" : "text-3xl")}>{person.name}</h2>
          <span className={cx("sw-card-muted font-semibold", compact ? "text-xl" : "text-2xl")}>{person.age}</span>
          {onOpen && <span className="ml-auto self-center h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "rgba(21,16,31,.06)" }}><ChevronDown size={18} style={{ transform: "rotate(180deg)" }} /></span>}
        </div>
        <p className="text-sm sw-card-muted mt-1 truncate">{person.major}, {classOf(person.grad)}</p>
        <div className="flex gap-1.5 mt-2.5 overflow-hidden">
          {tags.length ? (
            <>
              {tags.slice(0, 2).map((t) => <OverlapTag key={t.label} tag={t} onCard small />)}
              {tags.length > 2 && <span className="text-xs font-bold sw-card-muted self-center">+{tags.length - 2}</span>}
            </>
          ) : (
            (person.interests || []).slice(0, 3).map((i) => (
              <span key={i} className="rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap" style={{ background: "rgba(21,16,31,.06)" }}>{i}</span>
            ))
          )}
        </div>
      </button>
    </div>
  );
}

/** Draggable card with swipe physics. Drag right = like, left = pass, up = super like. */
function SwipeCard({ id, isTop, depth, onSwipe, request, onProgress, children }) {
  const scale = useContext(FrameScale);
  const [pos, setPos] = useState({ x: 0, y: 0, drag: false, out: null });
  const start = useRef(null);
  const done = useRef(false);
  const dragged = useRef(false);
  const fly = useCallback((dir) => {
    if (done.current) return;
    done.current = true;
    const out = dir === "like" ? { x: 560, y: 60 } : dir === "pass" ? { x: -560, y: 60 } : { x: 0, y: -980 };
    setPos({ x: out.x, y: out.y, drag: false, out: dir });
    if (onProgress) onProgress(1);
    setTimeout(() => onSwipe(dir), 270);
  }, [onSwipe, onProgress]);

  useEffect(() => {
    if (isTop && request && request.id === id) fly(request.dir);
  }, [request, isTop, id, fly]);

  const onPointerDown = (e) => {
    if (!isTop || done.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, pid: e.pointerId, el: e.currentTarget };
  };
  const onPointerMove = (e) => {
    const s = start.current;
    if (!s) return;
    const dx = (e.clientX - s.x) / scale;
    const dy = (e.clientY - s.y) / scale;
    if (!s.moved && Math.hypot(dx, dy) > 7) {
      s.moved = true;
      try { s.el.setPointerCapture(s.pid); } catch (err) { /* ignore */ }
    }
    if (s.moved) {
      setPos({ x: dx, y: dy, drag: true, out: null });
      if (onProgress) onProgress(Math.min(1, Math.hypot(dx, dy) / 160));
    }
  };
  const onPointerCancel = () => {
    const s = start.current;
    start.current = null;
    if (!s || !s.moved || done.current) return;
    setPos({ x: 0, y: 0, drag: false, out: null });
    if (onProgress) onProgress(0);
  };
  const onPointerUp = (e) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.moved) return;
    dragged.current = true;
    setTimeout(() => { dragged.current = false; }, 50);
    const dx = (e.clientX - s.x) / scale;
    const dy = (e.clientY - s.y) / scale;
    const vx = dx / Math.max(1, performance.now() - s.t);
    if (dx > 110 || (vx > 0.6 && dx > 40)) fly("like");
    else if (dx < -110 || (vx < -0.6 && dx < -40)) fly("pass");
    else if (dy < -140 && Math.abs(dx) < 100) fly("super");
    else {
      setPos({ x: 0, y: 0, drag: false, out: null });
      if (onProgress) onProgress(0);
    }
  };

  const rot = clamp(pos.x / 16, -22, 22);
  const likeO = clamp(pos.x / 100, 0, 1);
  const passO = clamp(-pos.x / 100, 0, 1);
  const superO = Math.abs(pos.x) < 90 ? clamp(-pos.y / 120, 0, 1) : 0;
  const transform = isTop
    ? `translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg)`
    : depth === 1
      ? "translateY(calc(14px - var(--drag, 0) * 14px)) scale(calc(0.95 + var(--drag, 0) * 0.05))"
      : "translateY(28px) scale(0.9)";
  const transition = pos.drag ? "none" : pos.out ? "transform .3s cubic-bezier(.4,0,1,1)" : "transform .32s cubic-bezier(.2,.9,.3,1.15)";
  return (
    <div
      className={cx("absolute inset-0 sw-noselect", isTop ? "touch-none" : "pointer-events-none")}
      style={{ transform, transition, zIndex: 10 - depth, willChange: "transform", cursor: isTop ? (pos.drag ? "grabbing" : "grab") : "default" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onClickCapture={(e) => { if (dragged.current) { e.stopPropagation(); e.preventDefault(); } }}
      aria-hidden={!isTop}
    >
      {children}
      {isTop && (
        <>
          <Stamp label="LIKE" tone="like" opacity={likeO} rotate={-14} style={{ top: 34, left: 22 }} />
          <Stamp label="PASS" tone="pass" opacity={passO} rotate={14} style={{ top: 34, right: 22 }} />
          <Stamp label="SUPER" tone="super" opacity={superO} rotate={-6} style={{ bottom: 150, left: "50%", marginLeft: -70 }} />
        </>
      )}
    </div>
  );
}

function SwipeButtons({ onPass, onSuper, onLike, disabled }) {
  return (
    <div className="flex items-center justify-center gap-6 pt-3 pb-4 shrink-0">
      <button type="button" aria-label="Pass" disabled={disabled} onClick={onPass}
        className="h-16 w-16 rounded-full sw-surface border sw-border sw-text flex items-center justify-center shadow-lg transition active:scale-90 disabled:opacity-40">
        <X size={30} strokeWidth={2.6} />
      </button>
      <button type="button" aria-label="Super like" disabled={disabled} onClick={onSuper}
        className="h-12 w-12 rounded-full sw-surface border sw-border flex items-center justify-center shadow-lg transition active:scale-90 disabled:opacity-40">
        <Star size={22} fill="url(#sw-brand)" stroke="url(#sw-brand)" />
      </button>
      <button type="button" aria-label="Like" disabled={disabled} onClick={onLike}
        className="h-20 w-20 rounded-full sw-grad flex items-center justify-center shadow-xl transition active:scale-90 disabled:opacity-40">
        <Heart size={34} fill="#fff" strokeWidth={0} />
      </button>
    </div>
  );
}

function DeckSkeleton() {
  return (
    <div className="absolute inset-0 rounded-3xl sw-surface p-2.5 flex flex-col gap-3" aria-label="Loading profiles" role="status">
      <Skeleton className="flex-1 rounded-2xl" />
      <Skeleton className="h-7 w-1/2 ml-2" />
      <Skeleton className="h-4 w-2/3 ml-2 mb-3" />
    </div>
  );
}

function shortCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : countdown(ms);
}

function SwirlNightChip({ sn, now, onClick }) {
  const left = (sn.live ? sn.end : sn.start) - now;
  return (
    <button type="button" onClick={onClick}
      className={cx("flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95", sn.live ? "sw-grad" : "sw-surface-2 sw-text")}
      aria-label={sn.live ? `Swirl Night is live, ${countdown(left)} left` : `Swirl Night starts in ${countdown(left)}`}>
      {sn.live ? <LiveDot className="bg-white" /> : <Moon size={14} className="shrink-0" />}
      <span>{sn.live ? "Live" : "Swirl Night"}</span>
      <span className={cx("sw-num font-semibold", !sn.live && "sw-muted")}>{shortCountdown(left)}</span>
    </button>
  );
}

function SwirlNightSheet({ open, onClose, sn, now, remind, setRemind, dropCount }) {
  const left = (sn.live ? sn.end : sn.start) - now;
  const when = new Date(sn.start).toLocaleDateString("en-US", { weekday: "long" });
  return (
    <Sheet open={open} onClose={onClose} title="Swirl Night">
      <div className="rounded-3xl sw-grad p-5 relative overflow-hidden">
        <SwirlGlyph size={140} stroke={3} color="rgba(255,255,255,.18)" className="absolute -right-6 -bottom-8" />
        <p className="text-sm font-semibold text-white">{sn.live ? "Live now. Ends in" : `Next drop ${when} at 9 PM. Starts in`}</p>
        <p className="sw-display text-5xl font-extrabold text-white sw-num mt-1">{countdown(left)}</p>
        {sn.live && <p className="text-sm text-white mt-2">{dropCount ? `${dropCount} new ${dropCount === 1 ? "person is" : "people are"} at the top of your deck.` : "Everyone from this drop is already in your deck."}</p>}
      </div>
      <p className="mt-5 text-sm sw-muted leading-relaxed">
        Every Thursday from 9 to 11 PM, a fresh batch of CU Boulder students drops into Discover for two hours. When it's over, unswiped drops disappear until next week.
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl sw-surface p-4 border sw-border">
        <div className="flex items-center gap-3"><Bell size={18} /><span className="text-sm font-semibold">Remind me when it starts</span></div>
        <Toggle checked={remind} onChange={setRemind} label="Remind me when Swirl Night starts" />
      </div>
    </Sheet>
  );
}

function FiltersSheet({ open, onClose, state, live, onApply }) {
  const [f, setF] = useState(state.filters);
  const [allMajors, setAllMajors] = useState(false);
  const [allInterests, setAllInterests] = useState(false);
  useEffect(() => { if (open) setF(state.filters); }, [open, state.filters]);
  const count = useMemo(() => buildDeck({ ...state, filters: f }, live).length, [state, f, live]);
  const majors = useMemo(() => [...new Set(Object.values(state.users).map((u) => u.major))].sort(), [state.users]);
  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const shownMajors = allMajors ? majors : majors.slice(0, 12);
  const shownInterests = allInterests ? INTERESTS : INTERESTS.slice(0, 16);
  return (
    <Sheet open={open} onClose={onClose} title="Filters"
      footer={
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setF(DEFAULT_FILTERS)}>Reset</Btn>
          <Btn className="flex-1" onClick={() => onApply(f)}>Show {count} {count === 1 ? "person" : "people"}</Btn>
        </div>
      }>
      <div className="flex flex-col gap-6">
        <Field label="Age range" right={<span className="text-sm font-bold sw-num">{f.ageMin} to {f.ageMax}</span>}>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-3 text-xs sw-muted"><span className="w-8">Min</span>
              <input type="range" className="sw-range" min={18} max={24} value={f.ageMin} aria-label="Minimum age"
                onChange={(e) => { const v = Number(e.target.value); setF((x) => ({ ...x, ageMin: v, ageMax: Math.max(v, x.ageMax) })); }} />
            </label>
            <label className="flex items-center gap-3 text-xs sw-muted"><span className="w-8">Max</span>
              <input type="range" className="sw-range" min={18} max={24} value={f.ageMax} aria-label="Maximum age"
                onChange={(e) => { const v = Number(e.target.value); setF((x) => ({ ...x, ageMax: v, ageMin: Math.min(v, x.ageMin) })); }} />
            </label>
          </div>
        </Field>
        <Field label="Graduation year">
          <div className="flex flex-wrap gap-2">{GRAD_YEARS.map((y) => <Chip key={y} small selected={f.grads.includes(y)} onClick={() => toggle("grads", y)}>{y}</Chip>)}</div>
        </Field>
        <Field label="Major" right={<button type="button" className="text-xs font-bold sw-grad-text" onClick={() => setAllMajors((v) => !v)}>{allMajors ? "Show fewer" : `Show all ${majors.length}`}</button>}>
          <div className="flex flex-wrap gap-2">{shownMajors.map((m) => <Chip key={m} small selected={f.majors.includes(m)} onClick={() => toggle("majors", m)}>{m}</Chip>)}</div>
        </Field>
        <Field label="Interests" hint="Shows people who share at least one." right={<button type="button" className="text-xs font-bold sw-grad-text" onClick={() => setAllInterests((v) => !v)}>{allInterests ? "Show fewer" : `Show all ${INTERESTS.length}`}</button>}>
          <div className="flex flex-wrap gap-2">{shownInterests.map((i) => <Chip key={i} small selected={f.interests.includes(i)} onClick={() => toggle("interests", i)}>{i}</Chip>)}</div>
        </Field>
      </div>
    </Sheet>
  );
}

/** Full profile: all photos, prompts, major, interests, campus overlap. Report and block live here too. */
function ProfileDetail({ person, state, onClose, onAction, onReport, onBlock, isMe = false }) {
  const me = state.account;
  const [idx, setIdx] = useState(0);
  const scroller = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const photos = person.photos && person.photos.length ? person.photos : [{ kind: "art", pal: person.pal || 0, motif: "portrait" }];
  const tags = isMe ? [] : overlapTags(me, person);
  const shared = new Set(isMe ? [] : (me && me.interests) || []);
  const score = isMe ? state.my.score : person.score;
  const vis = person.visibility;
  const onScroll = (e) => {
    const el = e.currentTarget;
    setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const goTo = (i) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <Layer>
    <div className="absolute inset-0 z-30 sw-app flex flex-col sw-anim-sheet" role="dialog" aria-modal="true" aria-label={`${person.name}'s profile`}>
      <div className="sw-scroll flex-1 min-h-0">
        <div className="relative">
          <div ref={scroller} onScroll={onScroll} className="flex sw-hscroll snap-x snap-mandatory" style={{ aspectRatio: "4 / 5" }}>
            {photos.map((p, i) => (
              <div key={i} className="relative w-full h-full shrink-0 snap-center">
                <PhotoArt photo={p} person={person} className="absolute inset-0" mono={130} />
              </div>
            ))}
          </div>
          {photos.length > 1 && (
            <div className="absolute top-3 left-4 right-16 flex gap-1">
              {photos.map((_, i) => (
                <button key={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => goTo(i)} className="h-1.5 flex-1 rounded-full" style={{ background: i === idx ? "#fff" : "rgba(255,255,255,.42)" }} />
              ))}
            </div>
          )}
          <IconBtn label="Close profile" onClick={onClose} variant="glass" className="absolute top-2 right-3" size={38}><X size={20} /></IconBtn>
          {isMe && <span className="absolute left-4 bottom-4 sw-glass rounded-full px-3 py-1 text-xs font-bold">Preview: how others see you</span>}
        </div>
        <div className="px-5 pt-5 pb-8 flex flex-col gap-6">
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="sw-display text-4xl font-extrabold leading-none">{person.name}</h2>
              <span className="text-3xl sw-muted font-semibold">{person.age}</span>
              {showPronouns(person.pronouns) && <span className="text-sm sw-muted">{person.pronouns}</span>}
            </div>
            <p className="mt-2 text-sm sw-muted flex items-center gap-1.5"><GraduationCap size={16} />{person.major}, {classOf(person.grad)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {vis !== "hidden" ? <TierBadge score={score} size="md" /> : <span className="text-xs font-semibold sw-muted rounded-full sw-surface-2 px-2.5 py-1">Hidden from leaderboard</span>}
              {vis === "public" && <span className="text-sm font-bold sw-num">{fmt(score)} pts</span>}
              {state.swipedMe && state.swipedMe[person.id] === "super" && !isMe && (
                <span className="inline-flex items-center gap-1 rounded-full sw-grad px-2.5 py-1 text-xs font-bold"><Star size={12} fill="#fff" strokeWidth={0} />Super liked you</span>
              )}
            </div>
          </div>
          {tags.length > 0 && (
            <div>
              <SectionLabel>You have in common</SectionLabel>
              <div className="flex flex-wrap gap-2">{tags.map((t) => <OverlapTag key={t.label} tag={t} />)}</div>
            </div>
          )}
          <div>
            <SectionLabel>About</SectionLabel>
            <p className="text-base leading-relaxed">{person.bio}</p>
          </div>
          <div className="flex flex-col gap-3">
            {(person.prompts || []).map((p, i) => (
              <div key={i} className="rounded-2xl sw-surface border sw-border p-4">
                <p className="text-sm font-semibold sw-muted">{promptText(p.q)}</p>
                <p className="sw-display text-xl font-bold mt-1.5 leading-snug">{p.a}</p>
              </div>
            ))}
          </div>
          <div>
            <SectionLabel>Interests</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {(person.interests || []).map((i) => (
                <span key={i} className={cx("rounded-full px-3 py-1.5 text-sm font-semibold", shared.has(i) ? "sw-grad-outline" : "sw-surface-2")}>{i}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl sw-surface border sw-border divide-y" style={{ borderColor: "var(--line)" }}>
            {[
              { Icon: MapPin, label: "Campus", value: "CU Boulder" },
              { Icon: Home, label: "Lives", value: person.dorm || "Off campus" },
              { Icon: BookOpen, label: "Classes", value: (person.classes || []).join(", ") || "Not shared" },
              { Icon: Heart, label: "Favorite spots", value: (person.spots || []).join(", ") || "Not shared" },
            ].map((r) => (
              <div key={r.label} className="flex items-start gap-3 px-4 py-3" style={{ borderColor: "var(--line)" }}>
                <r.Icon size={16} className="sw-muted mt-0.5 shrink-0" />
                <span className="text-sm sw-muted w-28 shrink-0">{r.label}</span>
                <span className="text-sm font-semibold flex-1 min-w-0">{r.value}</span>
              </div>
            ))}
          </div>
          {!isMe && (
            <div className="flex gap-2">
              <Btn variant="outline" icon={Flag} className="flex-1" onClick={onReport}>Report</Btn>
              <Btn variant="outline" icon={Ban} className="flex-1" onClick={onBlock}>Block</Btn>
            </div>
          )}
          {!isMe && <p className="text-xs sw-faint text-center -mt-3">{person.name} won't know if you report or block them.</p>}
        </div>
      </div>
      {onAction && (
        <div className="shrink-0 border-t sw-border">
          <SwipeButtons onPass={() => onAction("pass")} onSuper={() => onAction("super")} onLike={() => onAction("like")} />
        </div>
      )}
    </div>
    </Layer>
  );
}

function GroupCardFace({ group, users }) {
  const members = group.members.map((id) => users[id]).filter(Boolean);
  const names = members.map((m) => m.name);
  const nameLine = names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}` : names[0];
  return (
    <div className="absolute inset-0 rounded-3xl sw-card p-2.5 flex flex-col">
      <div className="relative flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-1.5">
        {members[0] && <PhotoArt photo={members[0].photos[0]} person={members[0]} className="row-span-2 rounded-2xl" mono={64} />}
        {members[1] && <PhotoArt photo={members[1].photos[0]} person={members[1]} className="rounded-2xl" mono={44} />}
        {members[2] && <PhotoArt photo={members[2].photos[0]} person={members[2]} className="rounded-2xl" mono={44} />}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full sw-glass px-2 py-0.5 text-xs font-bold"><Users size={12} />Group of {members.length}</span>
      </div>
      <div className="px-2 pt-3 pb-1">
        <h2 className="sw-display text-2xl font-extrabold leading-tight truncate">{group.name}</h2>
        <p className="text-sm sw-card-muted truncate">{nameLine}</p>
        <p className="text-sm mt-1.5 leading-snug" style={clamp2}>{group.vibe}</p>
        <div className="flex gap-1.5 mt-2">
          {group.tags.map((t) => <span key={t} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(21,16,31,.06)" }}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}

function Discover({ state, api, myRank, overlayOpen }) {
  const now = useNow(1000);
  const sn = swirlNightStatus(now, state.swirlOverride, state.swirlOverrideAt);
  const mode = state.discoverMode;
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [snOpen, setSnOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [request, setRequest] = useState(null);
  const deckRef = useRef(null);

  const deck = useMemo(() => buildDeck(state, sn.live), [state.users, state.swipes, state.blocked, state.filters, state.account, state.swipedMe, sn.live]);
  const groupDeck = useMemo(() => buildGroupDeck(state), [state.groupSwipes, state.blocked, state.users]);
  const dropCount = deck.filter((u) => u.drop).length;
  const hasGroup = state.group && state.group.members.length > 0;
  const activeDeck = mode === "group" ? (hasGroup ? groupDeck : []) : deck;
  const top = activeDeck[0];

  const reload = useCallback((ms = 650) => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => reload(600), [state.filters, mode, reload]);

  const setProgress = useCallback((p) => {
    if (deckRef.current) deckRef.current.style.setProperty("--drag", String(p));
  }, []);

  const doSwipe = useCallback((id, dir) => {
    setProgress(0);
    setRequest(null);
    if (mode === "group") api.groupSwipe(id, dir === "super" ? "like" : dir);
    else api.swipe(id, dir);
  }, [api, mode, setProgress]);

  const requestSwipe = useCallback((dir) => {
    if (!top || loading) return;
    setRequest({ id: top.id, dir, n: Date.now() });
  }, [top, loading]);

  const blocked = state.offline || state.paused || loading || !top || detailId || filtersOpen || snOpen || overlayOpen;
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || blocked) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); requestSwipe("pass"); }
      if (e.key === "ArrowRight") { e.preventDefault(); requestSwipe("like"); }
      if (e.key === "ArrowUp" && mode === "solo") { e.preventDefault(); requestSwipe("super"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestSwipe, blocked, mode]);

  const detail = detailId ? state.users[detailId] : null;

  let content;
  if (state.paused) {
    content = (
      <EmptyState icon={Pause} title="Your account is paused" body="You're hidden from Discover and the leaderboard. Your matches and chats still work."
        action={<Btn onClick={() => api.setPaused(false)} icon={Play}>Resume account</Btn>} />
    );
  } else if (state.offline) {
    content = (
      <EmptyState icon={WifiOff} tone="error" title="You're offline" body="New profiles couldn't load. Check your connection and try again."
        action={<Btn icon={RefreshCw} disabled={retrying} onClick={() => { setRetrying(true); setTimeout(() => { setRetrying(false); api.toast({ icon: WifiOff, title: "Still offline", body: "Turn off offline mode in Prototype controls.", tone: "danger" }); }, 900); }}>{retrying ? "Trying…" : "Try again"}</Btn>} />
    );
  } else if (mode === "group" && !state.group) {
    content = (
      <EmptyState icon={Users} title="Swipe as a squad" body="Team up with up to 2 friends and swipe on other groups. Group matches get a group chat."
        action={<Btn icon={UserPlus} onClick={() => api.push({ name: "group" })}>Start a group</Btn>} />
    );
  } else if (mode === "group" && !hasGroup) {
    content = (
      <EmptyState icon={Clock} title="Waiting on your friends" body="Your group can start swiping once at least one friend joins."
        action={<Btn variant="secondary" onClick={() => api.push({ name: "group" })}>Manage group</Btn>} />
    );
  } else if (loading) {
    content = <div className="relative h-full"><DeckSkeleton /></div>;
  } else if (!top) {
    const active = filtersActive(state.filters);
    content = mode === "group" ? (
      <EmptyState icon={Users} title="You've seen every group" body="New groups form every week. Check back soon."
        action={<Btn variant="secondary" onClick={() => api.resetGroupDeck()}>Review passed groups</Btn>} />
    ) : active ? (
      <EmptyState icon={SlidersHorizontal} title="No one matches these filters" body="Try widening the age range or removing a few majors and interests."
        action={<><Btn variant="secondary" onClick={() => api.setFilters(DEFAULT_FILTERS)}>Reset filters</Btn><Btn onClick={() => setFiltersOpen(true)}>Adjust filters</Btn></>} />
    ) : (
      <EmptyState icon={Sparkles} title="You've seen everyone for now" body={sn.live ? "That's the whole Swirl Night drop too. New students join every day." : "New students join every day. The next Swirl Night drop brings a fresh batch."}
        action={<Btn variant="secondary" icon={RotateCcw} onClick={() => api.resetDeck()}>Review people you passed</Btn>} />
    );
  } else {
    content = (
      <div ref={deckRef} className="relative h-full" style={{ "--drag": 0 }}>
        {activeDeck.slice(0, 3).reverse().map((item, i, arr) => {
          const depth = arr.length - 1 - i;
          return (
            <SwipeCard key={item.id} id={item.id} isTop={depth === 0} depth={depth} request={request} onProgress={depth === 0 ? setProgress : undefined}
              onSwipe={(dir) => doSwipe(item.id, dir)}>
              {mode === "group" ? (
                <GroupCardFace group={item} users={state.users} />
              ) : (
                <CardFace person={item} me={state.account} superLiked={state.swipedMe[item.id] === "super"} onOpen={depth === 0 ? () => setDetailId(item.id) : undefined} />
              )}
            </SwipeCard>
          );
        })}
      </div>
    );
  }

  const showButtons = !state.paused && !state.offline && !loading && !!top;

  return (
    <div className="relative h-full flex flex-col">
      {sn.live && <div className="absolute rounded-full sw-swirl-bg pointer-events-none" style={{ width: 360, height: 360, left: "50%", top: "18%", marginLeft: -180, opacity: 0.35 }} aria-hidden="true" />}
      <div className="relative flex items-center gap-2 px-4 h-14 shrink-0">
        <Wordmark size={24} />
        <div className="flex-1" />
        <ScorePill score={state.my.score} rank={myRank} onClick={() => api.setTab("profile")} />
        <IconBtn label="Filters" onClick={() => setFiltersOpen(true)} dot={filtersActive(state.filters)}><SlidersHorizontal size={18} /></IconBtn>
      </div>
      <div className="relative flex items-center gap-2 px-4 pb-1 shrink-0">
        <Segmented size="sm" className="w-40" value={mode} onChange={api.setDiscoverMode} label="Discover mode"
          options={[{ id: "solo", label: "Solo", icon: User }, { id: "group", label: "Group", icon: Users }]} />
        <div className="flex-1" />
        <SwirlNightChip sn={sn} now={now} onClick={() => setSnOpen(true)} />
      </div>
      {mode === "group" && hasGroup && (
        <button type="button" onClick={() => api.push({ name: "group" })} className="relative mx-4 mt-2 flex items-center gap-2 rounded-2xl sw-surface border sw-border px-3 py-2 text-left shrink-0">
          <div className="flex -space-x-2">
            <Avatar person={state.account} size={26} />
            {state.group.members.map((fid) => <Avatar key={fid} person={FRIENDS_BY_ID[fid]} size={26} />)}
          </div>
          <span className="text-sm font-bold truncate flex-1">{state.group.name}</span>
          <span className="text-xs sw-muted">Edit</span>
        </button>
      )}
      <div className="relative flex-1 min-h-0 mx-4 mt-3">{content}</div>
      {showButtons ? (
        mode === "group" ? (
          <div className="flex items-center justify-center gap-6 pt-3 pb-4 shrink-0">
            <button type="button" aria-label="Pass on this group" onClick={() => requestSwipe("pass")} className="h-16 w-16 rounded-full sw-surface border sw-border sw-text flex items-center justify-center shadow-lg active:scale-90 transition"><X size={30} strokeWidth={2.6} /></button>
            <button type="button" aria-label="Like this group" onClick={() => requestSwipe("like")} className="h-20 w-20 rounded-full sw-grad flex items-center justify-center shadow-xl active:scale-90 transition"><Heart size={34} fill="#fff" strokeWidth={0} /></button>
          </div>
        ) : (
          <SwipeButtons onPass={() => requestSwipe("pass")} onSuper={() => requestSwipe("super")} onLike={() => requestSwipe("like")} />
        )
      ) : (
        <div className="h-4 shrink-0" />
      )}

      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} state={state} live={sn.live}
        onApply={(f) => { api.setFilters(f); setFiltersOpen(false); }} />
      <SwirlNightSheet open={snOpen} onClose={() => setSnOpen(false)} sn={sn} now={now} dropCount={dropCount}
        remind={state.notifications.swirlNight} setRemind={(v) => api.setNotification("swirlNight", v)} />
      {detail && (
        <ProfileDetail person={detail} state={state} onClose={() => setDetailId(null)}
          onAction={(dir) => { setDetailId(null); setTimeout(() => requestSwipe(dir), 60); }}
          onReport={() => api.report(detail.id, () => setDetailId(null))}
          onBlock={() => api.confirmBlock(detail.id, () => setDetailId(null))} />
      )}
    </div>
  );
}

/* ========== 10. SCREENS: MATCH MOMENT, MATCHES, CHAT, REPORTING ========== */

function MiniPolaroid({ person, size = 128, className = "", style }) {
  return (
    <div className={cx("rounded-2xl bg-white p-1.5 shadow-2xl", className)} style={{ width: size, ...style }}>
      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
        <PhotoArt photo={person.photos && person.photos[0]} person={person} className="absolute inset-0" mono={Math.round(size * 0.36)} showCaption={false} />
      </div>
    </div>
  );
}

function AvatarCluster({ people, size = 56 }) {
  return (
    <div className="flex -space-x-4">
      {people.map((p) => (
        <div key={p.id || p.name} className="rounded-full" style={{ boxShadow: "0 0 0 3px #0E0B16" }}><Avatar person={p} size={size} /></div>
      ))}
    </div>
  );
}

function DateIdeaCard({ spot, onPick, dark = false }) {
  const cat = SPOT_CATS[spot.cat];
  const Icon = cat.Icon;
  return (
    <button type="button" onClick={() => onPick && onPick(spot)} className={cx("text-left rounded-2xl p-3 flex flex-col gap-1.5 transition active:scale-95 min-w-0", dark ? "" : "sw-surface border sw-border")}
      style={dark ? { background: "rgba(255,255,255,.1)", color: "#fff" } : undefined}>
      <span className="h-8 w-8 rounded-full sw-grad flex items-center justify-center"><Icon size={15} /></span>
      <span className="text-sm font-bold leading-tight" style={clamp2}>{spot.name}</span>
      <span className="text-xs" style={{ opacity: 0.75 }}>{cat.label}, {spot.area}</span>
    </button>
  );
}

/** "It's a Swirl!" — photos spiral in along a drawn spiral, confetti falls, date ideas appear. */
function MatchMoment({ match, state, onMessage, onClose }) {
  const isGroup = match.kind === "group";
  const partner = !isGroup ? state.users[match.userIds[0]] : null;
  const me = state.account;
  const ideas = (match.ideas || []).map((id) => SPOTS_BY_ID[id]).filter(Boolean);
  const confetti = useMemo(() => Array.from({ length: 28 }).map((_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.9, dur: 2.4 + Math.random() * 1.6, dx: (Math.random() - 0.5) * 140,
    color: ["#5B2EFF", "#FF3D8B", "#FF9A62", "#FFFFFF", "#8F5BFF"][i % 5], w: 6 + Math.random() * 6, h: 8 + Math.random() * 10, round: Math.random() < 0.3,
  })), []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const theirGroup = isGroup ? GROUPS.find((g) => g.id === match.groupId) : null;
  const myPeople = [me, ...(match.friendIds || []).map((id) => FRIENDS_BY_ID[id]).filter(Boolean)];
  const theirPeople = (match.userIds || []).map((id) => state.users[id]).filter(Boolean);
  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden" style={{ background: "#0E0B16", color: "#fff" }} role="dialog" aria-modal="true" aria-label="It's a Swirl">
      <div className="absolute rounded-full sw-swirl-bg pointer-events-none" style={{ width: 540, height: 540, left: "50%", top: "4%", marginLeft: -270 }} aria-hidden="true" />
      {confetti.map((c, i) => (
        <span key={i} className="sw-confetti pointer-events-none" aria-hidden="true"
          style={{ left: `${c.left}%`, width: c.w, height: c.h, background: c.color, borderRadius: c.round ? 999 : 2, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, "--dx": `${c.dx}px` }} />
      ))}
      <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative" style={{ width: 300, height: 220 }}>
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <SwirlGlyph size={250} stroke={2} draw color="rgba(255,255,255,.4)" />
          </div>
          {isGroup ? (
            <>
              <div className="absolute sw-orbit-l" style={{ left: 0, top: 70 }}><AvatarCluster people={myPeople} size={60} /></div>
              <div className="absolute sw-orbit-r" style={{ right: 0, top: 70 }}><AvatarCluster people={theirPeople} size={60} /></div>
            </>
          ) : (
            <>
              <div className="absolute sw-orbit-l" style={{ left: 22, top: 22 }}><MiniPolaroid person={me} size={126} /></div>
              <div className="absolute sw-orbit-r" style={{ right: 22, top: 22 }}><MiniPolaroid person={partner} size={126} /></div>
            </>
          )}
          <div className="absolute left-1/2 sw-anim-pop" style={{ bottom: 6, marginLeft: -26, animationDelay: ".75s" }}>
            <span className="rounded-full sw-grad flex items-center justify-center shadow-2xl" style={{ width: 52, height: 52, boxShadow: "0 0 0 4px #0E0B16" }}>
              <Heart size={24} fill="#fff" strokeWidth={0} />
            </span>
          </div>
        </div>
        <h1 className="sw-display font-extrabold sw-anim-pop mt-4 leading-none" style={{ fontSize: 50, animationDelay: ".5s" }}>
          {isGroup ? "It's a Group Swirl!" : "It's a Swirl!"}
        </h1>
        <p className="mt-3 text-base sw-anim-rise" style={{ color: "rgba(255,255,255,.82)", animationDelay: ".7s" }}>
          {isGroup ? `Your group and ${theirGroup ? theirGroup.name : "theirs"} liked each other.` : `You and ${partner ? partner.name : "they"} liked each other.`}
        </p>
        {ideas.length > 0 && (
          <div className="w-full mt-6 sw-anim-rise" style={{ animationDelay: ".9s" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,.75)" }}>Date ideas near campus</p>
            <div className="grid grid-cols-3 gap-2">
              {ideas.map((s) => <DateIdeaCard key={s.id} spot={s} dark onPick={(spot) => onMessage(spot)} />)}
            </div>
          </div>
        )}
      </div>
      <div className="relative px-6 pb-8 pt-2 flex flex-col gap-2.5 shrink-0">
        <Btn size="lg" variant="white" icon={MessageCircle} onClick={() => onMessage(null)}>Send a message</Btn>
        <Btn size="lg" variant="ghost" onClick={onClose} style={{ color: "#fff" }}>Keep swiping</Btn>
      </div>
    </div>
  );
}

function matchTitle(m, state) {
  if (m.kind === "group") return m.name;
  const u = state.users[m.userIds[0]];
  return u ? u.name : "Match";
}

function MatchAvatar({ m, state, size = 52, ring = false }) {
  if (m.kind === "group") {
    const people = m.userIds.map((id) => state.users[id]).filter(Boolean);
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {people[0] && <div className="absolute left-0 top-0"><Avatar person={people[0]} size={Math.round(size * 0.7)} /></div>}
        {people[1] && <div className="absolute right-0 bottom-0 rounded-full" style={{ boxShadow: "0 0 0 2px var(--bg)" }}><Avatar person={people[1]} size={Math.round(size * 0.7)} /></div>}
      </div>
    );
  }
  return <Avatar person={state.users[m.userIds[0]]} size={size} ring={ring} />;
}

function MatchesScreen({ state, api }) {
  const [loading, setLoading] = useState(true);
  const now = useNow(30000);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);
  const real = (m) => m.messages.filter((x) => x.from !== "system");
  const fresh = state.matches.filter((m) => real(m).length === 0).sort((a, b) => b.createdAt - a.createdAt);
  const convos = state.matches.filter((m) => real(m).length > 0).sort((a, b) => b.lastActivity - a.lastActivity);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-end justify-between px-5 pt-3 pb-3 shrink-0">
        <h1 className="sw-display text-3xl font-bold">Matches</h1>
        <span className="text-sm sw-muted pb-1">{state.matches.length} total</span>
      </div>
      <div className="sw-scroll flex-1 min-h-0 pb-6">
        {loading ? (
          <div className="px-5 flex flex-col gap-5" role="status" aria-label="Loading matches">
            <div className="flex gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-16 rounded-full" />)}</div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3"><Skeleton className="rounded-full" style={{ width: 52, height: 52 }} /><div className="flex-1 flex flex-col gap-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-2/3" /></div></div>
            ))}
          </div>
        ) : state.matches.length === 0 ? (
          <EmptyState icon={Heart} title="No matches yet" body="When you and someone both swipe right, they show up here. Swirl Night is a good time to start."
            action={<Btn icon={Flame} onClick={() => api.setTab("discover")}>Start swiping</Btn>} />
        ) : (
          <>
            {fresh.length > 0 && (
              <div className="mb-4">
                <h2 className="px-5 text-sm font-bold sw-muted mb-2">New matches</h2>
                <div className="sw-hscroll flex gap-4 px-5 pb-1">
                  {fresh.map((m) => (
                    <button key={m.id} type="button" onClick={() => api.openChat(m.id)} className="flex flex-col items-center gap-1.5 w-16 shrink-0 active:scale-95 transition" aria-label={`Open chat with ${matchTitle(m, state)}`}>
                      <MatchAvatar m={m} state={state} size={64} ring />
                      <span className="text-xs font-semibold truncate w-full text-center">{matchTitle(m, state)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <h2 className="px-5 text-sm font-bold sw-muted mb-1">Messages</h2>
            {convos.length === 0 ? (
              <p className="px-5 py-6 text-sm sw-muted">Say hi to your new matches. Replying within 24 hours earns +5.</p>
            ) : (
              <ul>
                {convos.map((m) => {
                  const msgs = real(m);
                  const last = msgs[msgs.length - 1];
                  const typing = state.typing[m.id];
                  const yourTurn = last && last.from !== "me" && !m.unread;
                  const lastSender = last && last.from !== "me" && m.kind === "group" ? personFor(last.from, state) : null;
                  return (
                    <li key={m.id}>
                      <button type="button" onClick={() => api.openChat(m.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left transition active:opacity-70">
                        <MatchAvatar m={m} state={state} size={52} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold truncate">{matchTitle(m, state)}</span>
                            {m.date && m.date.done && <CalendarHeart size={14} className="sw-muted shrink-0" aria-label="Date confirmed" />}
                            <span className="ml-auto text-xs sw-faint shrink-0">{timeAgo(last.ts, now)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {typing ? (
                              <span className="text-sm font-semibold sw-grad-text">typing…</span>
                            ) : (
                              <span className={cx("text-sm truncate", m.unread ? "font-bold sw-text" : "sw-muted")}>
                                {last.from === "me" ? "You: " : lastSender ? `${lastSender.name}: ` : ""}{last.text}
                              </span>
                            )}
                            {m.unread > 0 && <span className="ml-auto shrink-0 h-5 px-1.5 rounded-full sw-grad text-xs font-bold flex items-center justify-center sw-num" style={{ minWidth: 20 }}>{m.unread}</span>}
                            {yourTurn && !typing && <span className="ml-auto shrink-0 rounded-full sw-surface-2 px-2 py-0.5 text-xs font-bold">Your turn</span>}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TypingBubble({ person }) {
  return (
    <div className="flex items-end gap-2 sw-anim-rise" role="status" aria-label={`${person ? person.name : "Someone"} is typing`}>
      {person && <Avatar person={person} size={26} />}
      <div className="rounded-3xl rounded-bl-md sw-surface-2 px-4 py-3 flex gap-1">
        {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full sw-typing-dot" style={{ background: "var(--muted)", animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
  );
}

function ChatScreen({ state, api, matchId, initialDraft }) {
  const m = state.matches.find((x) => x.id === matchId);
  const [text, setText] = useState(initialDraft || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(true);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const now = useNow(30000);
  const typingId = state.typing[matchId];

  useEffect(() => { if (m && m.unread) api.markRead(matchId); }, [m && m.unread, matchId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [m && m.messages.length, typingId]);

  if (!m) {
    return (
      <div className="h-full flex flex-col sw-app">
        <ScreenHeader title="Chat" onBack={api.pop} />
        <EmptyState icon={MessageCircle} title="This chat has ended" body="The match was removed, or one of you blocked the other." action={<Btn onClick={api.pop}>Back to matches</Btn>} />
      </div>
    );
  }

  const isGroup = m.kind === "group";
  const partner = !isGroup ? state.users[m.userIds[0]] : null;
  const ideas = (m.ideas || []).map((id) => SPOTS_BY_ID[id]).filter(Boolean);
  const tags = partner ? overlapTags(state.account, partner) : [];
  const typingPerson = typingId ? personFor(typingId, state) : null;
  const members = isGroup ? [...m.userIds.map((id) => state.users[id]), ...(m.friendIds || []).map((id) => FRIENDS_BY_ID[id])].filter(Boolean) : [];

  const send = () => {
    const t = text.trim();
    if (!t) return;
    api.sendMessage(matchId, t);
    setText("");
    if (inputRef.current) inputRef.current.focus();
  };
  const suggest = (spot) => {
    setText(`Want to check out ${spot.name} this week?`);
    if (inputRef.current) inputRef.current.focus();
  };

  const visible = m.messages;
  const quick = partner
    ? [`Hey ${partner.name}! 👋`, "Coffee this week?", "Best spot on campus. Go."]
    : ["Hey everyone! 👋", "Group hang this weekend?", "Who's picking the spot?"];

  return (
    <div className="relative h-full flex flex-col sw-app">
      <div className="flex items-center gap-2 px-2 h-16 shrink-0 border-b sw-border">
        <IconBtn label="Back" onClick={api.pop} variant="plain"><ChevronLeft size={26} /></IconBtn>
        <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => (isGroup ? setMembersOpen(true) : setProfileOpen(true))}>
          <MatchAvatar m={m} state={state} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold truncate">{matchTitle(m, state)}</span>
              {partner && partner.visibility !== "hidden" && <TierBadge score={partner.score} label={false} />}
            </div>
            <p className={cx("text-xs truncate", typingPerson ? "sw-grad-text font-semibold" : "sw-muted")}>
              {typingPerson ? `${isGroup ? `${typingPerson.name} is ` : ""}typing…` : isGroup ? `${members.length + 1} people` : "Active today"}
            </p>
          </div>
        </button>
        <IconBtn label="Chat options" onClick={() => setMenuOpen(true)} variant="plain"><MoreVertical size={22} /></IconBtn>
      </div>

      <div ref={listRef} className="sw-scroll flex-1 min-h-0 px-4 py-4 flex flex-col gap-2">
        <div className="text-center mb-2">
          <p className="text-xs sw-muted">You matched {timeAgo(m.createdAt, now) === "now" ? "just now" : `${timeAgo(m.createdAt, now)} ago`}</p>
          {tags.length > 0 && <div className="flex flex-wrap justify-center gap-1.5 mt-2">{tags.slice(0, 3).map((t) => <OverlapTag key={t.label} tag={t} small />)}</div>}
        </div>
        {ideas.length > 0 && (
          <div className="rounded-2xl sw-surface border sw-border p-3 mb-2">
            <button type="button" className="w-full flex items-center justify-between" onClick={() => setIdeasOpen((v) => !v)} aria-expanded={ideasOpen}>
              <span className="flex items-center gap-2 text-sm font-bold"><MapPin size={16} />Date ideas for {isGroup ? "your groups" : "you two"}</span>
              <ChevronDown size={18} className="sw-muted transition-transform" style={{ transform: ideasOpen ? "rotate(180deg)" : "none" }} />
            </button>
            {ideasOpen && (
              <div className="flex flex-col gap-2 mt-3">
                {ideas.map((s) => {
                  const Icon = SPOT_CATS[s.cat].Icon;
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full sw-surface-2 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.name}</p>
                        <p className="text-xs sw-muted truncate">{s.area}. {s.blurb}</p>
                      </div>
                      <Btn size="sm" variant="secondary" onClick={() => suggest(s)}>Suggest</Btn>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {visible.map((msg, i) => {
          const prev = visible[i - 1];
          const nextMsg = visible[i + 1];
          const newDay = !prev || startOfDay(prev.ts) !== startOfDay(msg.ts);
          if (msg.from === "system") {
            return (
              <div key={msg.id} className="flex flex-col items-center gap-2 my-1">
                {newDay && <span className="text-xs font-semibold sw-faint">{dayLabel(msg.ts, now)}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full sw-surface-2 px-3 py-1.5 text-xs font-semibold"><Sparkles size={12} />{msg.text}</span>
              </div>
            );
          }
          const mine = msg.from === "me";
          const sender = mine ? null : personFor(msg.from, state);
          const lastOfRun = !nextMsg || nextMsg.from !== msg.from || nextMsg.ts - msg.ts > 10 * MIN;
          const firstOfRun = !prev || prev.from !== msg.from || newDay;
          return (
            <div key={msg.id} className="flex flex-col">
              {newDay && <span className="self-center text-xs font-semibold sw-faint my-2">{dayLabel(msg.ts, now)}</span>}
              {isGroup && !mine && firstOfRun && sender && <span className="text-xs sw-muted ml-9 mb-0.5">{sender.name}</span>}
              <div className={cx("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && <div style={{ width: 26 }} className="shrink-0">{lastOfRun && sender && <Avatar person={sender} size={26} />}</div>}
                <div className={cx("px-4 py-2.5 text-sm leading-snug sw-anim-rise", mine ? "sw-grad rounded-3xl rounded-br-md" : "sw-surface-2 rounded-3xl rounded-bl-md", msg.status === "failed" && "opacity-60")}
                  style={{ maxWidth: "76%", overflowWrap: "anywhere" }}>
                  {msg.text}
                </div>
              </div>
              {msg.status === "failed" ? (
                <button type="button" onClick={() => api.retryMessage(matchId, msg.id)} className="self-end mt-1 flex items-center gap-1 text-xs font-semibold sw-down">
                  <AlertTriangle size={12} />Not delivered. Tap to retry.
                </button>
              ) : lastOfRun ? (
                <span className={cx("text-xs sw-faint mt-1", mine ? "self-end mr-1" : "ml-9")}>{clockTime(msg.ts)}</span>
              ) : null}
            </div>
          );
        })}
        {typingPerson && <TypingBubble person={typingPerson} />}
      </div>

      {visible.filter((x) => x.from !== "system").length === 0 && (
        <div className="sw-hscroll flex gap-2 px-4 pb-2 shrink-0">
          {quick.map((q) => <Chip key={q} small onClick={() => { setText(q); if (inputRef.current) inputRef.current.focus(); }}>{q}</Chip>)}
        </div>
      )}
      <form className="flex items-center gap-2 px-3 pb-6 pt-2 shrink-0 border-t sw-border" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={`Message ${matchTitle(m, state)}`}
          aria-label="Message" className="sw-input flex-1 rounded-full px-4 h-11 text-sm" />
        <button type="submit" aria-label="Send" disabled={!text.trim()} className="h-11 w-11 rounded-full sw-grad flex items-center justify-center transition active:scale-90 disabled:opacity-40">
          <Send size={18} />
        </button>
      </form>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={matchTitle(m, state)}>
        <div className="flex flex-col">
          {partner && <MenuRow icon={User} label="View profile" onClick={() => { setMenuOpen(false); setProfileOpen(true); }} />}
          {isGroup && <MenuRow icon={Users} label="View members" onClick={() => { setMenuOpen(false); setMembersOpen(true); }} />}
          {partner && (
            m.date.done ? (
              <MenuRow icon={CalendarHeart} label="Date confirmed" sub="You both got +15" disabled />
            ) : m.date.me ? (
              <MenuRow icon={Clock} label={`Waiting for ${partner.name} to confirm`} sub="You'll both get +15 when they do" disabled />
            ) : (
              <MenuRow icon={CalendarHeart} label="We went on a date" sub="When you both confirm, you each get +15" onClick={() => { setMenuOpen(false); api.confirmDate(matchId); }} />
            )
          )}
          <MenuRow icon={Shield} label="Share date plans with a friend" onClick={() => { setMenuOpen(false); api.push({ name: "safety", matchId }); }} />
          <MenuRow icon={X} label={isGroup ? "Leave group chat" : "Unmatch"} onClick={() => { setMenuOpen(false); api.confirmUnmatch(matchId); }} />
          {partner ? (
            <>
              <MenuRow icon={Flag} label={`Report ${partner.name}`} danger onClick={() => { setMenuOpen(false); api.report(partner.id); }} />
              <MenuRow icon={Ban} label={`Block ${partner.name}`} danger onClick={() => { setMenuOpen(false); api.confirmBlock(partner.id); }} />
            </>
          ) : (
            <MenuRow icon={Flag} label="Report or block someone" danger onClick={() => { setMenuOpen(false); setMembersOpen(true); }} />
          )}
        </div>
      </Sheet>

      <Sheet open={membersOpen} onClose={() => setMembersOpen(false)} title="Members">
        <ul className="flex flex-col gap-1">
          <li className="flex items-center gap-3 py-2"><Avatar person={state.account} size={40} /><span className="font-semibold flex-1">{state.account.name} (you)</span></li>
          {members.map((p) => {
            const isFriend = !!FRIENDS_BY_ID[p.id];
            return (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <Avatar person={p} size={40} />
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{p.name}</p><p className="text-xs sw-muted truncate">{isFriend ? "Your group" : p.major}</p></div>
                {!isFriend && (
                  <>
                    <IconBtn label={`Report ${p.name}`} size={36} onClick={() => { setMembersOpen(false); api.report(p.id); }}><Flag size={16} /></IconBtn>
                    <IconBtn label={`Block ${p.name}`} size={36} onClick={() => { setMembersOpen(false); api.confirmBlock(p.id); }}><Ban size={16} /></IconBtn>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Sheet>

      {profileOpen && partner && (
        <ProfileDetail person={partner} state={state} onClose={() => setProfileOpen(false)}
          onReport={() => { setProfileOpen(false); api.report(partner.id); }}
          onBlock={() => { setProfileOpen(false); api.confirmBlock(partner.id); }} />
      )}
    </div>
  );
}

function MenuRow({ icon: Icon, label, sub, onClick, danger, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-3 py-3 text-left transition active:opacity-70 disabled:opacity-60">
      <span className="h-10 w-10 rounded-full sw-surface-2 flex items-center justify-center shrink-0" style={danger ? { color: "var(--down)" } : undefined}><Icon size={18} /></span>
      <span className="flex-1 min-w-0">
        <span className={cx("block font-semibold", danger && "sw-down")}>{label}</span>
        {sub && <span className="block text-xs sw-muted mt-0.5">{sub}</span>}
      </span>
    </button>
  );
}

function ReportSheet({ target, onClose, onSubmit, onDone }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [done, setDone] = useState(false);
  if (!target) return null;
  return (
    <Sheet open onClose={done ? () => onDone(alsoBlock) : onClose} title={done ? "Report sent" : `Report ${target.name}`}
      footer={done ? (
        <Btn className="w-full" onClick={() => onDone(alsoBlock)}>Done</Btn>
      ) : (
        <Btn className="w-full" disabled={!reason} onClick={() => { onSubmit({ reason, details: details.trim() }); setDone(true); }}>Submit report</Btn>
      )}>
      {done ? (
        <div className="flex flex-col items-center text-center py-6 sw-anim-rise">
          <div className="h-16 w-16 rounded-full sw-grad flex items-center justify-center mb-4"><ShieldCheck size={28} /></div>
          <p className="sw-display text-2xl font-bold">Thanks for telling us</p>
          <p className="mt-2 text-sm sw-muted leading-relaxed sw-balance">
            Our safety team reviews every report within 24 hours. {target.name} won't know you reported them.
            {alsoBlock ? ` When you tap Done, ${target.name} is blocked.` : ""}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm sw-muted">What's going on? {target.name} won't see your report.</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Reason">
            {REPORT_REASONS.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)}
                className={cx("flex items-center justify-between rounded-2xl px-4 h-12 text-sm font-semibold text-left transition", reason === r ? "sw-grad-outline" : "sw-surface border sw-border")}>
                {r}
                <span className={cx("h-5 w-5 rounded-full border-2 flex items-center justify-center", reason === r ? "border-transparent sw-grad" : "sw-border")}>{reason === r && <Check size={12} />}</span>
              </button>
            ))}
          </div>
          <Field label="Anything else? (optional)" htmlFor="report-details">
            <textarea id="report-details" rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder="Add details that help us review it" className="sw-input w-full rounded-2xl px-4 py-3 text-sm resize-none" />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-2xl sw-surface border sw-border px-4 py-3">
            <span className="text-sm font-semibold">Also block {target.name}</span>
            <Toggle checked={alsoBlock} onChange={setAlsoBlock} label={`Also block ${target.name}`} />
          </div>
          {reason === "Seems under 18" && (
            <p className="text-xs sw-muted rounded-2xl sw-surface-2 p-3 leading-relaxed">Reports about minors go to the front of the queue. We pause the account while we review it.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ========= 11. SCREENS: LEADERBOARD, CAMPUS RIVALRY, SEASON RECAP ========= */

const SEASON_END_TS = [new Date(2026, 11, 18, 23, 59).getTime(), new Date(2027, 4, 7, 23, 59).getTime(), new Date(2027, 11, 17, 23, 59).getTime(), new Date(2028, 4, 5, 23, 59).getTime()];
const seasonEnd = (n) => SEASON_END_TS[n - 1] || SEASON_END_TS[SEASON_END_TS.length - 1];

function BoardValue({ e, tab }) {
  if (e.visibility === "tier") return <TierBadge score={e.score} />;
  if (tab === "week") return <span className={cx("font-bold sw-num", e.weekGain >= 0 ? "sw-up" : "sw-down")}>{signed(e.weekGain)}</span>;
  return (
    <span className="flex items-center gap-1.5">
      <TierShape tier={tierFor(e.score)} size={16} />
      <span className="font-bold sw-num">{fmt(e.score)}</span>
    </span>
  );
}

function Podium({ rows, tab, onOpen }) {
  const slots = [rows[1], rows[0], rows[2]];
  const heights = [64, 92, 48];
  return (
    <div className="flex items-end justify-center gap-3 px-5 pt-3">
      {slots.map((e, i) =>
        e ? (
          <button key={e.id} type="button" onClick={() => onOpen(e)} className="flex-1 flex flex-col items-center min-w-0 transition active:scale-95" aria-label={`Rank ${e.rank}, ${e.isMe ? "you" : e.name}`}>
            {e.rank === 1 ? <Crown size={22} className="mb-1" style={{ color: "#FFC93C" }} fill="#FFC93C" /> : <span style={{ height: 26 }} />}
            <div className="relative">
              <Avatar person={e} size={e.rank === 1 ? 76 : 62} ring={e.rank === 1 || e.isMe} />
            </div>
            <p className="mt-2 text-sm font-bold truncate max-w-full">{e.isMe ? "You" : e.name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm"><BoardValue e={e} tab={tab} /></div>
            <Movement move={e.move} className="mt-1" />
            <div className="w-full mt-2 rounded-t-2xl sw-grad flex items-start justify-center pt-2" style={{ height: heights[i], opacity: e.rank === 1 ? 1 : 0.78 }}>
              <span className="sw-display text-2xl font-extrabold text-white sw-num">{e.rank}</span>
            </div>
          </button>
        ) : (
          <div key={`empty-${i}`} className="flex-1" />
        )
      )}
    </div>
  );
}

function YourRankCard({ state, board, tab, classYear, onSwitchClass, onOpen }) {
  const a = state.account;
  const mine = board.mine;
  const hidden = a.visibility === "hidden" || state.paused;
  const scoreChange = state.my.score - state.my.yesterday;
  if (!mine) {
    return (
      <div className="absolute left-3 right-3 bottom-3 rounded-3xl sw-card p-3.5 flex items-center gap-3 sw-anim-rise">
        <Avatar person={a} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-bold">You're in the class of {a.grad}</p>
          <p className="text-xs sw-card-muted">Switch to see where you rank.</p>
        </div>
        <Btn size="sm" onClick={onSwitchClass}>View {a.grad}</Btn>
      </div>
    );
  }
  return (
    <button type="button" onClick={onOpen} className="absolute left-3 right-3 bottom-3 rounded-3xl sw-card p-3.5 flex items-center gap-3 text-left sw-anim-rise" aria-label={`Your rank: ${mine.rank}`}>
      <div className="flex flex-col items-center shrink-0" style={{ width: 64 }}>
        <span className="text-xs sw-card-muted font-semibold">{tab === "class" ? `Class of ${classYear}` : tab === "week" ? "This week" : "Your rank"}</span>
        <span className="sw-display text-3xl font-extrabold sw-grad-text sw-num leading-tight">#{mine.rank}</span>
      </div>
      <Avatar person={a} size={44} />
      <div className="flex-1 min-w-0">
        {hidden ? (
          <>
            <p className="font-bold flex items-center gap-1.5 whitespace-nowrap"><EyeOff size={14} className="shrink-0" />Hidden</p>
            <p className="text-xs sw-card-muted">{state.paused ? "Your account is paused." : "Only you see this rank."}</p>
          </>
        ) : (
          <>
            <p className="font-bold sw-num">{tab === "week" ? `${signed(state.my.weekGain)} this week` : `${fmt(state.my.score)} pts`}</p>
            <p className="text-xs sw-card-muted flex items-center gap-1.5 flex-wrap">
              <Movement move={mine.move} />
              <span>since yesterday</span>
              {tab !== "week" && <span className={cx("font-bold sw-num", scoreChange > 0 ? "sw-up" : scoreChange < 0 ? "sw-down" : "")}>{signed(scoreChange)} pts</span>}
            </p>
          </>
        )}
      </div>
      <TierBadge score={state.my.score} tone="card" />
    </button>
  );
}

function SeasonSheet({ open, onClose, state, now, onRecap, onArchive }) {
  const n = state.season.number;
  const daysLeft = Math.max(0, Math.ceil((seasonEnd(n) - now) / DAY));
  return (
    <Sheet open={open} onClose={onClose} title={seasonLabel(n)}>
      <div className="rounded-3xl sw-grad p-5 relative overflow-hidden">
        <SwirlGlyph size={150} stroke={3} color="rgba(255,255,255,.18)" className="absolute -right-8 -bottom-10" />
        <p className="text-sm font-semibold text-white">Season ends {shortDate(seasonEnd(n))}</p>
        <p className="sw-display text-5xl font-extrabold text-white sw-num mt-1">{daysLeft} days</p>
        <p className="text-sm text-white mt-1">left to climb</p>
      </div>
      <p className="mt-5 text-sm sw-muted leading-relaxed">
        Rankings reset to 1,000 at the start of every semester, so new students get a fair shot. When a season ends, you get a recap of how it went.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Btn icon={Sparkles} onClick={onRecap}>See your season so far</Btn>
        {state.archive && <Btn variant="secondary" icon={Trophy} onClick={onArchive}>{state.archive.label} recap</Btn>}
      </div>
    </Sheet>
  );
}

function Rivalry({ rivalry }) {
  const [metric, setMetric] = useState("total");
  const schools = Object.values(rivalry);
  const val = (s) => (metric === "total" ? s.swipes : s.swipes / s.active);
  const sorted = [...schools].sort((a, b) => val(b) - val(a));
  const max = Math.max(...schools.map(val));
  const lead = sorted[0];
  const second = sorted[1];
  const gap = metric === "total" ? `${fmt(lead.swipes - second.swipes)} swipes` : `${(val(lead) - val(second)).toFixed(1)} swipes per student`;
  const show = (s) => (metric === "total" ? fmt(s.swipes) : val(s).toFixed(1));
  return (
    <div className="px-4 pb-8 sw-anim-rise">
      <div className="rounded-3xl sw-surface border sw-border p-4">
        <div className="flex items-center gap-2 text-xs font-bold sw-muted"><LiveDot />Live this week</div>
        <h2 className="sw-display text-2xl font-bold mt-2 sw-balance leading-tight">{lead.name} leads the Front Range rivalry</h2>
        <p className="text-sm sw-muted mt-1">Ahead of {second.short} by {gap}.</p>
        <Segmented size="sm" className="mt-4" value={metric} onChange={setMetric} label="Rivalry metric"
          options={[{ id: "total", label: "Total swipes" }, { id: "per", label: "Per active student" }]} />
        <div className="mt-5 flex flex-col gap-4" role="list">
          {sorted.map((s, i) => (
            <div key={s.id} role="listitem">
              <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                <span className="font-bold flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="truncate">{i + 1}. {s.name}</span>
                  {s.id === "cu" && <span className="text-xs sw-muted font-semibold shrink-0">Your school</span>}
                </span>
                <span className="font-bold sw-num shrink-0">{show(s)}</span>
              </div>
              <div className="h-3 rounded-full sw-surface-2 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(4, (val(s) / max) * 100)}%`, background: s.color, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-3xl sw-surface border sw-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="sw-muted text-xs">
              <th className="text-left font-semibold px-4 py-2.5">This week</th>
              {schools.map((s) => <th key={s.id} className="text-right font-semibold px-3 py-2.5">{s.short}</th>)}
            </tr>
          </thead>
          <tbody className="sw-num">
            {[["Matches", "matches"], ["Dates confirmed", "dates"], ["Active students", "active"]].map(([label, k]) => (
              <tr key={k} className="border-t sw-border">
                <td className="px-4 py-2.5 font-semibold">{label}</td>
                {schools.map((s) => <td key={s.id} className="text-right px-3 py-2.5 font-bold">{fmt(s[k])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs sw-faint text-center">Your swipes, matches, and confirmed dates count toward CU Boulder's total. Totals reset every Monday.</p>
    </div>
  );
}

function Leaderboard({ state, api }) {
  const a = state.account;
  const [tab, setTab] = useState("campus");
  const [classYear, setClassYear] = useState(a.grad);
  const [loading, setLoading] = useState(true);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const now = useNow(60000);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(t);
  }, [tab, classYear]);
  const board = useMemo(() => (tab === "rivalry" ? null : getBoard(state, tab, classYear)), [state.users, state.my, state.blocked, state.account, state.paused, tab, classYear]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (e) => setProfile(e.isMe ? { isMe: true } : state.users[e.id] || null);
  const rows = board ? board.rows : [];
  const tabs = [
    { id: "campus", label: "Campus" },
    { id: "week", label: "This week" },
    { id: "class", label: "By class" },
    { id: "rivalry", label: "Rivalry" },
  ];
  return (
    <div className="relative h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-5 pt-3 pb-3 shrink-0">
        <h1 className="sw-display text-3xl font-bold">Leaderboard</h1>
        <button type="button" onClick={() => setSeasonOpen(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-full sw-surface-2 text-xs font-bold active:scale-95 transition">
          <Trophy size={14} />{seasonLabel(state.season.number)}
        </button>
      </div>
      <div className="px-4 shrink-0">
        <Segmented size="sm" value={tab} onChange={setTab} options={tabs} label="Leaderboard view" />
        {tab === "class" && (
          <div className="flex gap-2 mt-3">
            {GRAD_YEARS.map((y) => (
              <Chip key={y} small selected={classYear === y} onClick={() => setClassYear(y)}>{y}</Chip>
            ))}
          </div>
        )}
        {state.offline && (
          <div className="mt-3 rounded-2xl px-3 py-2 text-xs font-semibold flex items-center gap-2" style={{ background: "rgba(255,92,115,.14)", color: "var(--down)" }} role="status">
            <WifiOff size={14} />Offline. Showing the last update.
          </div>
        )}
      </div>
      <div className="sw-scroll flex-1 min-h-0 mt-2" style={{ paddingBottom: tab === "rivalry" ? 16 : 104 }}>
        {tab === "rivalry" ? (
          loading ? (
            <div className="px-4 flex flex-col gap-3" role="status" aria-label="Loading rivalry"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-36 rounded-3xl" /></div>
          ) : (
            <Rivalry rivalry={state.rivalry} />
          )
        ) : loading ? (
          <div className="px-4 flex flex-col gap-3" role="status" aria-label="Loading leaderboard">
            <div className="flex items-end justify-center gap-3 px-2 pt-6">
              <Skeleton className="flex-1 h-36 rounded-2xl" /><Skeleton className="flex-1 h-44 rounded-2xl" /><Skeleton className="flex-1 h-32 rounded-2xl" />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-14" /></div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Trophy} title="No one here yet" body="Nobody in this class year is on the leaderboard yet." />
        ) : (
          <div className="sw-anim-rise">
            <Podium rows={rows} tab={tab} onOpen={open} />
            <ul className="mt-4 px-2 flex flex-col gap-0.5">
              {rows.slice(3).map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => open(e)} className={cx("w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-left transition active:opacity-70", e.isMe && "sw-grad-outline")}>
                    <span className="w-7 text-right sw-display font-bold sw-num shrink-0">{e.rank}</span>
                    <span className="w-9 flex justify-center shrink-0"><Movement move={e.move} /></span>
                    <Avatar person={e} size={40} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{e.isMe ? `${e.name} (you)` : e.name}</span>
                      <span className="block text-xs sw-muted">{CLASS_SINGULAR[e.grad] || ""}</span>
                    </span>
                    <BoardValue e={e} tab={tab} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="px-6 mt-4 text-xs sw-faint text-center leading-relaxed">
              Hidden profiles don't appear. Tier-only profiles show a badge instead of a score. Pass counts are never shown to anyone.
            </p>
          </div>
        )}
      </div>
      {tab !== "rivalry" && board && !loading && (
        <YourRankCard state={state} board={board} tab={tab} classYear={classYear} onSwitchClass={() => setClassYear(a.grad)} onOpen={() => api.setTab("profile")} />
      )}
      <SeasonSheet open={seasonOpen} onClose={() => setSeasonOpen(false)} state={state} now={now}
        onRecap={() => { setSeasonOpen(false); api.openRecap(); }} onArchive={() => { setSeasonOpen(false); api.openRecap(true); }} />
      {profile && (
        <ProfileDetail person={profile.isMe ? state.account : profile} isMe={!!profile.isMe} state={state} onClose={() => setProfile(null)}
          onReport={() => { const id = profile.id; setProfile(null); api.report(id); }}
          onBlock={() => { const id = profile.id; setProfile(null); api.confirmBlock(id); }} />
      )}
    </div>
  );
}

/* ---------- Season recap (Wrapped-style swipeable cards) ---------- */

function SeasonRecap({ data, onClose, onShared }) {
  const [i, setI] = useState(0);
  const [manual, setManual] = useState("");
  const start = useRef(null);
  const tier = TIERS[TIER_INDEX[data.topTier] || 0];
  const shareText = `My Swirl ${data.label} recap: ${fmt(data.likes)} likes, peak rank #${data.peakRank || "–"} at CU Boulder, ${tier.name} tier. Find your swirl.`;
  const cards = [
    {
      bg: "linear-gradient(160deg,#5B2EFF,#FF3D8B)",
      body: (
        <div className="flex flex-col items-center text-center">
          <SwirlGlyph size={150} stroke={4} draw color="#fff" />
          <p className="mt-6 text-base font-semibold" style={{ opacity: 0.85 }}>{data.label}</p>
          <h2 className="sw-display text-5xl font-extrabold mt-2 leading-none sw-balance">{data.final ? "Your season, wrapped" : "Your season so far"}</h2>
          <p className="mt-4 text-base" style={{ opacity: 0.85 }}>Let's see how you swirled.</p>
        </div>
      ),
    },
    {
      bg: "linear-gradient(160deg,#FF3D8B,#FF9A62)",
      body: (
        <div>
          <p className="text-xl font-semibold" style={{ opacity: 0.9 }}>You got</p>
          <p className="sw-display font-extrabold leading-none sw-num mt-2" style={{ fontSize: 112 }}>{fmt(data.likes)}</p>
          <p className="sw-display text-3xl font-bold mt-2">likes this season</p>
          <p className="mt-5 text-base" style={{ opacity: 0.9 }}>
            {data.likes === 0 ? "Your first likes are on the way." : data.supers ? `${data.supers} of them were Super Likes.` : "No Super Likes yet. Swirl Night is your moment."}
          </p>
        </div>
      ),
    },
    {
      bg: "linear-gradient(160deg,#2D2BD6,#2EC5FF)",
      body: (
        <div>
          <p className="text-xl font-semibold" style={{ opacity: 0.9 }}>Your peak rank</p>
          <p className="sw-display font-extrabold leading-none sw-num mt-2" style={{ fontSize: 120 }}>#{data.peakRank || "–"}</p>
          <p className="sw-display text-3xl font-bold mt-2">on the CU Boulder leaderboard</p>
          <p className="mt-5 text-base" style={{ opacity: 0.9 }}>{data.peakAt ? `You hit it on ${shortDate(data.peakAt)}.` : "Keep climbing. It updates live."}</p>
        </div>
      ),
    },
    {
      bg: "radial-gradient(120% 80% at 50% 30%, #3B2A5C, #0E0B16)",
      body: (
        <div className="flex flex-col items-center text-center">
          <p className="text-xl font-semibold" style={{ opacity: 0.9 }}>Top tier you reached</p>
          <div className="mt-6 sw-anim-pop"><TierShape tier={tier} size={150} /></div>
          <p className="sw-display text-6xl font-extrabold mt-4">{tier.name}</p>
          <p className="mt-3 text-base" style={{ opacity: 0.8 }}>{tier.id === "diamond" ? "The very top. Legendary." : `Next season, aim for ${TIERS[Math.min(TIERS.length - 1, TIER_INDEX[tier.id] + 1)].name}.`}</p>
        </div>
      ),
    },
    {
      bg: "linear-gradient(160deg,#0F9B8E,#2D7FF9)",
      body: data.top ? (
        <div>
          <p className="text-xl font-semibold" style={{ opacity: 0.9 }}>Your matches were into</p>
          <p className="sw-display font-extrabold leading-none mt-3 sw-balance" style={{ fontSize: 64 }}>{data.top.interest}</p>
          <p className="mt-5 text-base" style={{ opacity: 0.9 }}>{data.top.count} of your {data.top.total} matches listed it. You know your type.</p>
        </div>
      ) : (
        <div>
          <p className="text-xl font-semibold" style={{ opacity: 0.9 }}>Your matches' favorite interest</p>
          <p className="sw-display text-4xl font-extrabold mt-3">Still a mystery</p>
          <p className="mt-4 text-base" style={{ opacity: 0.9 }}>Match with a few people and we'll find your type.</p>
        </div>
      ),
    },
    {
      bg: "linear-gradient(160deg,#5B2EFF,#FF3D8B)",
      body: (
        <div>
          <p className="text-base font-semibold" style={{ opacity: 0.85 }}>{data.label}</p>
          <h2 className="sw-display text-4xl font-extrabold mt-1 leading-tight">That's a wrap</h2>
          <div className="grid grid-cols-2 gap-2.5 mt-6">
            {[["Likes", fmt(data.likes)], ["Peak rank", `#${data.peakRank || "–"}`], ["Top tier", tier.name], ["Matches", fmt(data.matches)]].map(([k, v]) => (
              <div key={k} className="rounded-2xl p-3.5" style={{ background: "rgba(255,255,255,.14)" }}>
                <p className="text-xs font-semibold" style={{ opacity: 0.85 }}>{k}</p>
                <p className="sw-display text-3xl font-extrabold sw-num mt-1">{v}</p>
              </div>
            ))}
          </div>
          {manual && (
            <div className="mt-4" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold mb-1.5">Copy this and paste it anywhere:</p>
              <textarea readOnly value={manual} rows={3} onFocus={(e) => e.target.select()} className="w-full rounded-2xl p-3 text-sm resize-none" style={{ background: "rgba(0,0,0,.25)", color: "#fff" }} aria-label="Recap text to copy" />
            </div>
          )}
        </div>
      ),
    },
  ];
  const last = cards.length - 1;
  const go = (d) => setI((x) => clamp(x + d, 0, last));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const share = async (e) => {
    e.stopPropagation();
    const r = await shareOrCopy(shareText, "My Swirl recap");
    if (r === "manual") setManual(shareText);
    else if (r !== "cancelled") onShared(r);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden sw-noselect" style={{ background: cards[i].bg, color: "#fff", transition: "background .4s ease" }}
      role="dialog" aria-modal="true" aria-label="Season recap"
      onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        if (Math.abs(dx) > 50) { go(dx < 0 ? 1 : -1); return; }
        if (Math.abs(e.clientY - s.y) > 30) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (e.target.closest && e.target.closest("button, textarea")) return;
        go(e.clientX - r.left < r.width * 0.3 ? -1 : 1);
      }}>
      <div className="flex gap-1 px-4 pt-4 shrink-0" aria-hidden="true">
        {cards.map((_, k) => (
          <span key={k} className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.3)" }}>
            <span className="block h-full bg-white" style={{ width: k <= i ? "100%" : "0%", transition: "width .35s ease" }} />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 pt-3 shrink-0">
        <Wordmark size={20} />
        <button type="button" aria-label="Close recap" onClick={(e) => { e.stopPropagation(); onClose(); }} className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)" }}><X size={18} /></button>
      </div>
      <div key={i} className="flex-1 min-h-0 flex flex-col justify-center px-7 sw-anim-rise">{cards[i].body}</div>
      <div className="px-6 pb-8 pt-2 shrink-0 flex flex-col gap-2">
        {i === last ? (
          <>
            <Btn size="lg" variant="white" icon={Share2} onClick={share}>Share my recap</Btn>
            <Btn size="lg" variant="ghost" style={{ color: "#fff" }} onClick={(e) => { e.stopPropagation(); onClose(); }}>Done</Btn>
          </>
        ) : (
          <p className="text-center text-sm font-semibold" style={{ opacity: 0.75 }}>Tap or swipe to continue</p>
        )}
      </div>
    </div>
  );
}

/* ==== 12. SCREENS: MY PROFILE, EDIT PROFILE, SETTINGS, SAFETY, GROUP, DEV ==== */

function niceTicks(lo, hi, count = 3) {
  const span = hi - lo;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

/** 14-day Swirl Score trend: 2px line, soft area, hairline grid, labeled endpoint, crosshair tooltip, table view. */
function ScoreChart({ series, onBackfill }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const W = 340;
  const H = 156;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 24;
  if (series.length < 2) {
    return (
      <div className="rounded-2xl sw-surface-2 p-4">
        <svg viewBox={`0 0 ${W} 70`} className="w-full h-auto" aria-hidden="true">
          <line x1="0" x2={W} y1="45" y2="45" stroke="var(--faint)" strokeWidth="1.5" strokeDasharray="4 6" />
          <circle cx={W - 20} cy="45" r="5" fill="#FF3D8B" stroke="var(--surface-2)" strokeWidth="2" />
        </svg>
        <p className="text-sm font-semibold mt-2">Your trend starts today</p>
        <p className="text-xs sw-muted mt-1">Each day adds a point. Check back tomorrow to see your first line.</p>
        {onBackfill && <Btn size="sm" variant="secondary" icon={TrendingUp} className="mt-3" onClick={onBackfill}>Simulate two weeks</Btn>}
      </div>
    );
  }
  const vals = series.map((p) => p.s);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = Math.max(30, maxV - minV);
  const lo = Math.floor((minV - span * 0.2) / 10) * 10;
  const hi = Math.ceil((maxV + span * 0.2) / 10) * 10;
  const xAt = (i) => padL + (i / (series.length - 1)) * (W - padL - padR);
  const yAt = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
  const area = `${line} L${xAt(vals.length - 1).toFixed(1)} ${H - padB} L${xAt(0).toFixed(1)} ${H - padB} Z`;
  const ticks = niceTicks(lo, hi, 3);
  const lastI = vals.length - 1;
  const hv = hover == null ? null : { i: hover, x: xAt(hover), y: yAt(vals[hover]), p: series[hover] };
  const labelIdx = [0, Math.floor(lastI / 2), lastI];
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < series.length; i++) if (Math.abs(xAt(i) - px) < Math.abs(xAt(best) - px)) best = i;
    setHover(best);
  };
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none" role="img"
          aria-label={`Swirl Score over the last ${series.length} days, from ${fmt(vals[0])} to ${fmt(vals[lastI])}`}
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={yAt(t)} y2={yAt(t)} stroke="var(--line)" strokeWidth="1" />
              <text x={padL - 6} y={yAt(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--faint)" className="sw-num">{fmt(t)}</text>
            </g>
          ))}
          <path d={area} fill="url(#sw-area)" />
          <path d={line} fill="none" stroke="url(#sw-brand-h)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {labelIdx.map((i) => (
            <text key={i} x={xAt(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === lastI ? "end" : "middle"} fontSize="10" fill="var(--faint)">
              {i === lastI ? "Today" : shortDate(series[i].t)}
            </text>
          ))}
          {hv && <line x1={hv.x} x2={hv.x} y1={padT} y2={H - padB} stroke="var(--muted)" strokeWidth="1" />}
          <circle cx={xAt(lastI)} cy={yAt(vals[lastI])} r="4.5" fill="#FF3D8B" stroke="var(--surface)" strokeWidth="2" />
          {hv && <circle cx={hv.x} cy={hv.y} r="4.5" fill="#5B2EFF" stroke="var(--surface)" strokeWidth="2" />}
        </svg>
        {hv && (
          <div className="absolute pointer-events-none rounded-xl sw-surface-2 px-2.5 py-1.5 text-xs shadow-lg border sw-border"
            style={{ left: `${(hv.x / W) * 100}%`, top: 0, transform: `translateX(${hv.i > lastI / 2 ? "-105%" : "5%"})` }}>
            <p className="sw-muted">{hv.i === lastI ? "Today" : shortDate(hv.p.t)}</p>
            <p className="font-bold sw-num">{fmt(hv.p.s)} pts</p>
          </div>
        )}
      </div>
      <button type="button" onClick={() => setTable((v) => !v)} className="mt-2 text-xs font-bold sw-muted" aria-expanded={table}>
        {table ? "Hide table" : "Show as table"}
      </button>
      {table && (
        <table className="w-full text-xs mt-2 sw-num">
          <tbody>
            {series.map((p, i) => (
              <tr key={p.t} className="border-t sw-border">
                <td className="py-1.5 sw-muted">{i === lastI ? "Today" : shortDate(p.t)}</td>
                <td className="py-1.5 text-right font-bold">{fmt(p.s)}</td>
                <td className={cx("py-1.5 text-right", i && p.s - series[i - 1].s >= 0 ? "sw-up" : "sw-down")}>{i ? signed(p.s - series[i - 1].s) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ScoringInfo({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="How Swirl Score works">
      <div className="flex flex-col gap-5 text-sm leading-relaxed">
        <p className="sw-muted">Everyone starts each season at 1,000. Your score moves with the swipes you receive and how you treat your matches.</p>
        <div className="rounded-2xl sw-surface border sw-border divide-y" style={{ borderColor: "var(--line)" }}>
          {[
            ["Like received", "+10 × weight"],
            ["Super Like received", "+25 × weight"],
            ["Pass received", "−3"],
            ["Reply to a new match within 24 hours", "+5"],
            ["You both confirm a date", "+15 each"],
            ["Unmatch someone you never replied to", "−5"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderColor: "var(--line)" }}>
              <span>{k}</span><span className="font-bold sw-num whitespace-nowrap">{v}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="font-bold">Weight</p>
          <p className="sw-muted mt-1">The liker's score divided by yours, kept between ×0.5 and ×2. A like from someone at 1,400 when you're at 1,000 is worth +14. Passes are always a flat −3, so the system isn't brutal.</p>
        </div>
        <div>
          <p className="font-bold">Floor</p>
          <p className="sw-muted mt-1">Your score never drops below 500.</p>
        </div>
        <div>
          <p className="font-bold mb-2">Tiers</p>
          <div className="flex flex-col gap-2">
            {TIERS.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <TierShape tier={t} size={22} />
                <span className="font-semibold w-20">{t.name}</span>
                <span className="sw-muted sw-num">{i === 0 ? "Under 900" : `${fmt(t.min)}${TIERS[i + 1] ? ` to ${fmt(TIERS[i + 1].min - 1)}` : "+"}`}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="sw-muted">Nobody else ever sees how many passes you got. Others only see your score and tier, and only if your visibility allows it.</p>
      </div>
    </Sheet>
  );
}

function BreakdownRow({ icon: Icon, label, count, pts, note }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="h-9 w-9 rounded-full sw-surface-2 flex items-center justify-center shrink-0"><Icon size={16} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {note && <span className="flex items-center gap-1 text-xs sw-muted mt-0.5"><Lock size={11} />{note}</span>}
      </span>
      <span className="text-sm sw-muted sw-num w-12 text-right">{fmt(count)}</span>
      <span className={cx("text-sm font-bold sw-num w-14 text-right", pts > 0 ? "sw-up" : pts < 0 ? "sw-down" : "sw-muted")}>{signed(pts)}</span>
    </div>
  );
}

function MyProfile({ state, api, board }) {
  const a = state.account;
  const my = state.my;
  const now = useNow(60000);
  const [preview, setPreview] = useState(false);
  const [info, setInfo] = useState(false);
  const tier = tierFor(my.score);
  const nt = nextTier(my.score);
  const progress = nt ? (my.score - tier.min) / (nt.min - tier.min) : 1;
  const series = [...my.history, { t: startOfDay(now), s: my.score }];
  const mine = board.mine;
  const st = my.stats;
  const net = st.likePts + st.superPts + st.passPts + st.replyPts + st.datePts + st.ghostPts;
  const vis = VISIBILITY.find((v) => v.id === a.visibility);
  const recent = my.activity.slice(0, 6);
  const activityText = (ev) => {
    if (ev.kind === "like") return `Like from a ${TIERS[TIER_INDEX[ev.fromTier] || 0].name} member`;
    if (ev.kind === "super") return `Super Like from a ${TIERS[TIER_INDEX[ev.fromTier] || 0].name} member`;
    if (ev.kind === "reply") return "Replied to a new match within 24h";
    if (ev.kind === "date") return "You both confirmed a date";
    if (ev.kind === "ghost") return "Unmatched without replying";
    return "Score update";
  };
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0">
        <h1 className="sw-display text-3xl font-bold">Profile</h1>
        <div className="flex gap-2">
          <IconBtn label="Edit profile" onClick={() => api.push({ name: "edit" })}><Pencil size={18} /></IconBtn>
          <IconBtn label="Settings" onClick={() => api.push({ name: "settings" })}><Settings size={18} /></IconBtn>
        </div>
      </div>
      <div className="sw-scroll flex-1 min-h-0 px-4 pb-8 flex flex-col gap-4">
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-bold sw-muted">How others see you</h2>
            <button type="button" onClick={() => api.push({ name: "settings" })} className="flex items-center gap-1.5 text-xs font-bold rounded-full sw-surface-2 px-2.5 h-7">
              <vis.Icon size={12} />{vis.label}
            </button>
          </div>
          <div className="relative mx-auto" style={{ height: 400, maxWidth: 330 }}>
            <CardFace person={{ ...a, score: my.score }} me={null} onOpen={() => setPreview(true)} compact />
          </div>
        </section>

        <section className="rounded-3xl sw-surface border sw-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold sw-muted">Swirl Score</p>
              <p className="sw-display font-extrabold sw-grad-text sw-num leading-none mt-1" style={{ fontSize: 56 }}>{fmt(my.score)}</p>
              <div className="mt-2"><TierBadge score={my.score} size="md" /></div>
            </div>
            {mine && (
              <div className="text-right">
                <p className="text-sm font-bold sw-muted">Campus rank</p>
                <p className="sw-display text-4xl font-extrabold sw-num leading-none mt-1">#{mine.rank}</p>
                <div className="mt-2 flex items-center justify-end gap-1 text-xs sw-muted"><Movement move={mine.move} />since yesterday</div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className="h-2.5 rounded-full sw-surface-2 overflow-hidden">
              <div className="h-full rounded-full sw-grad sw-fill-bar" style={{ width: `${Math.max(3, progress * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs sw-muted">{nt ? `${fmt(nt.min - my.score)} points to ${nt.name}` : "Diamond is the top tier. Stay in it."}</p>
          </div>
          <button type="button" onClick={() => setInfo(true)} className="mt-3 flex items-center gap-1.5 text-xs font-bold sw-grad-text"><Info size={13} style={{ color: "#8F5BFF" }} />How scoring works</button>
        </section>

        <section className="rounded-3xl sw-surface border sw-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold sw-muted">Score trend, last 14 days</h2>
            {series.length > 1 && <span className={cx("text-xs font-bold sw-num", series[series.length - 1].s - series[0].s >= 0 ? "sw-up" : "sw-down")}>{signed(series[series.length - 1].s - series[0].s)}</span>}
          </div>
          <ScoreChart series={series.slice(-14)} onBackfill={api.backfill} />
        </section>

        <section className="rounded-3xl sw-surface border sw-border overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold sw-muted">Score breakdown this season</h2>
            <span className="text-xs sw-faint">Count, points</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            <BreakdownRow icon={Heart} label="Likes received" count={st.likes} pts={st.likePts} />
            <BreakdownRow icon={Star} label="Super Likes received" count={st.supers} pts={st.superPts} />
            <BreakdownRow icon={X} label="Passes received" count={st.passes} pts={st.passPts} note="Only you can see this" />
            <BreakdownRow icon={MessageCircle} label="Replied within 24 hours" count={st.replies} pts={st.replyPts} />
            <BreakdownRow icon={CalendarHeart} label="Dates confirmed" count={st.dates} pts={st.datePts} />
            <BreakdownRow icon={Minus} label="Unmatched without replying" count={st.ghosts} pts={st.ghostPts} />
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t sw-border">
            <span className="text-sm font-bold">Net change from 1,000</span>
            <span className={cx("sw-display text-lg font-extrabold sw-num", net >= 0 ? "sw-up" : "sw-down")}>{signed(my.score - SCORING.START)}</span>
          </div>
        </section>

        <section className="rounded-3xl sw-surface border sw-border p-4">
          <h2 className="text-sm font-bold sw-muted mb-2">Recent activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm sw-muted py-2">No likes yet. When someone likes you, it shows up here with the points it was worth.</p>
          ) : (
            <ul className="flex flex-col">
              {recent.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3 py-2">
                  <span className="h-8 w-8 rounded-full sw-surface-2 flex items-center justify-center shrink-0">
                    {ev.kind === "super" ? <Star size={14} /> : ev.kind === "reply" ? <MessageCircle size={14} /> : ev.kind === "date" ? <CalendarHeart size={14} /> : ev.kind === "ghost" ? <Minus size={14} /> : <Heart size={14} />}
                  </span>
                  <span className="flex-1 min-w-0 text-sm truncate">{activityText(ev)}</span>
                  <span className={cx("text-sm font-bold sw-num", ev.delta >= 0 ? "sw-up" : "sw-down")}>{signed(ev.delta)}</span>
                  <span className="text-xs sw-faint w-8 text-right">{timeAgo(ev.ts, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl sw-grad p-4 relative overflow-hidden">
          <SwirlGlyph size={130} stroke={3} color="rgba(255,255,255,.18)" className="absolute -right-6 -bottom-8" />
          <p className="text-sm font-semibold text-white">{seasonLabel(state.season.number)}</p>
          <p className="sw-display text-2xl font-bold text-white mt-1">Ends {shortDate(seasonEnd(state.season.number))}</p>
          <Btn size="sm" variant="white" icon={Sparkles} className="mt-3" onClick={() => api.openRecap()}>See your recap so far</Btn>
        </section>

        <section className="rounded-3xl sw-surface border sw-border p-4 flex items-center gap-3">
          <span className="h-11 w-11 rounded-full sw-surface-2 flex items-center justify-center shrink-0"><Users size={20} /></span>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{state.group ? state.group.name : "Group mode"}</p>
            <p className="text-xs sw-muted">{state.group ? `${1 + state.group.members.length} of 3 joined` : "Swipe on other groups with up to 2 friends"}</p>
          </div>
          <Btn size="sm" variant="secondary" onClick={() => api.push({ name: "group" })}>{state.group ? "Manage" : "Start"}</Btn>
        </section>
      </div>
      {preview && <ProfileDetail person={{ ...a, score: my.score }} isMe state={state} onClose={() => setPreview(false)} />}
      <ScoringInfo open={info} onClose={() => setInfo(false)} />
    </div>
  );
}

function EditProfile({ state, api }) {
  const a = state.account;
  const [d, setD] = useState(() => ({ ...a, prompts: a.prompts.map((p) => ({ ...p })), photos: [...a.photos] }));
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const [showErrors, setShowErrors] = useState(false);
  const bErr = basicsErrors(d);
  const bioErr = d.bio.trim().length < 20;
  const promptsErr = !d.prompts.every((p) => p.a.trim().length >= 2);
  const photosErr = d.photos.length < 2;
  const interestsErr = d.interests.length < 3;
  const valid = !Object.keys(bErr).length && !bioErr && !promptsErr && !photosErr && !interestsErr;
  const dirty = JSON.stringify(d) !== JSON.stringify(a);
  const save = () => {
    if (!valid) {
      setShowErrors(true);
      api.toast({ icon: AlertTriangle, title: "Check the highlighted fields", tone: "danger" });
      return;
    }
    api.updateAccount({ ...d, name: d.name.trim(), bio: d.bio.trim(), prompts: d.prompts.map((p) => ({ q: p.q, a: p.a.trim() })) });
    api.toast({ icon: CheckCircle2, title: "Profile saved" });
    api.pop();
  };
  return (
    <div className="h-full flex flex-col sw-app">
      <ScreenHeader title="Edit profile" onBack={api.pop} right={<Btn size="sm" onClick={save} disabled={!dirty} className="mr-2">Save</Btn>} />
      <div className="sw-scroll flex-1 min-h-0 px-5 pb-10 flex flex-col gap-8">
        <section>
          <SectionLabel>Photos</SectionLabel>
          <PhotoGrid photos={d.photos} onChange={(photos) => set({ photos })} person={d} />
          {showErrors && photosErr && <p className="mt-2 text-xs font-semibold sw-down">Add at least 2 photos.</p>}
        </section>
        <section>
          <Field label="Bio" htmlFor="ep-bio" error={showErrors && bioErr ? "Write at least 20 characters." : ""}
            right={<span className={cx("text-xs sw-num", d.bio.length > 280 ? "sw-down font-bold" : "sw-faint")}>{d.bio.length}/300</span>}>
            <textarea id="ep-bio" rows={4} maxLength={300} value={d.bio} onChange={(e) => set({ bio: e.target.value })}
              className={cx("sw-input w-full rounded-2xl px-4 py-3 text-base resize-none", showErrors && bioErr && "sw-invalid")} />
          </Field>
        </section>
        <section>
          <SectionLabel>Prompts</SectionLabel>
          <PromptEditor prompts={d.prompts} onChange={(prompts) => set({ prompts })} showErrors={showErrors} />
        </section>
        <section>
          <SectionLabel>Basics</SectionLabel>
          <BasicsFields data={d} set={set} showErrors={showErrors} age={a.age} />
        </section>
        <section>
          <SectionLabel>Interests</SectionLabel>
          <InterestPicker value={d.interests} onChange={(interests) => set({ interests })} />
          {showErrors && interestsErr && <p className="mt-2 text-xs font-semibold sw-down">Pick at least 3.</p>}
        </section>
        <section>
          <SectionLabel>Campus</SectionLabel>
          <CampusPicker classes={d.classes} dorm={d.dorm} spots={d.spots} onChange={set} />
        </section>
        <Btn size="lg" onClick={save} disabled={!dirty}>Save changes</Btn>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, sub, children, onClick, danger }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} className={cx("w-full flex items-center gap-3 px-4 py-3 text-left", onClick && "transition active:opacity-70")}>
      {Icon && <span className="h-9 w-9 rounded-full sw-surface-2 flex items-center justify-center shrink-0" style={danger ? { color: "var(--down)" } : undefined}><Icon size={17} /></span>}
      <span className="flex-1 min-w-0">
        <span className={cx("block text-sm font-semibold", danger && "sw-down")}>{label}</span>
        {sub && <span className="block text-xs sw-muted mt-0.5">{sub}</span>}
      </span>
      {children}
      {onClick && !children && <ChevronRight size={18} className="sw-faint shrink-0" />}
    </Comp>
  );
}

function SettingsGroup({ title, children, note }) {
  return (
    <section>
      <h2 className="text-sm font-bold sw-muted mb-2 px-1">{title}</h2>
      <div className="rounded-3xl sw-surface border sw-border overflow-hidden divide-y" style={{ borderColor: "var(--line)" }}>{children}</div>
      {note && <p className="text-xs sw-faint mt-2 px-1 leading-relaxed">{note}</p>}
    </section>
  );
}

function DevControls({ state, api }) {
  const now = useNow(1000);
  const sn = swirlNightStatus(now, state.swirlOverride, state.swirlOverrideAt);
  const ready = state.stage === "app" && state.account;
  if (!ready) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm sw-muted leading-relaxed">Sign up, or open the demo account, to use the live controls.</p>
        <Btn icon={Play} onClick={api.startDemo}>Open the demo account</Btn>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-full sw-surface-2 flex items-center justify-center shrink-0"><Moon size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">Swirl Night live</span>
          <span className="block text-xs sw-muted sw-num">{sn.live ? `${countdown(sn.end - now)} left` : `Starts in ${countdown(sn.start - now)}`}</span>
        </span>
        <Toggle checked={sn.live} onChange={api.setSwirlNight} label="Swirl Night live" />
      </div>
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 rounded-full sw-surface-2 flex items-center justify-center shrink-0"><WifiOff size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">Simulate offline</span>
          <span className="block text-xs sw-muted">Shows error states</span>
        </span>
        <Toggle checked={state.offline} onChange={api.setOffline} label="Simulate offline" />
      </div>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="h-9 w-9 rounded-full sw-surface-2 flex items-center justify-center shrink-0"><Zap size={17} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Students swiping on you</span>
            <span className="block text-xs sw-muted">Moves your score and rank live</span>
          </span>
        </div>
        <Segmented size="sm" value={state.simSpeed} onChange={api.setSimSpeed} label="Incoming swipe speed"
          options={[{ id: "off", label: "Off" }, { id: "normal", label: "Normal" }, { id: "fast", label: "Fast" }]} />
      </div>
      <div className="flex flex-col gap-2 mt-1">
        <Btn size="sm" variant="secondary" icon={Heart} onClick={api.devMatch}>Trigger a match</Btn>
        <Btn size="sm" variant="secondary" icon={TrendingUp} onClick={api.backfill}>Fast-forward two weeks</Btn>
        <Btn size="sm" variant="secondary" icon={Sparkles} onClick={() => api.openRecap()}>Open season recap</Btn>
      </div>
      <Btn size="sm" variant="danger" icon={RotateCcw} onClick={api.confirmSeasonReset}>Semester reset: all scores to 1,000</Btn>
    </div>
  );
}

function SettingsScreen({ state, api }) {
  const a = state.account;
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const f = state.filters;
  const n = state.notifications;
  return (
    <div className="relative h-full flex flex-col sw-app">
      <ScreenHeader title="Settings" onBack={api.pop} />
      <div className="sw-scroll flex-1 min-h-0 px-4 pb-10 flex flex-col gap-6">
        <SettingsGroup title="Account">
          <SettingRow icon={Mail} label={a.email} sub="Verified school email">
            <span className="inline-flex items-center gap-1 text-xs font-bold sw-up"><CheckCircle2 size={14} />Verified</span>
          </SettingRow>
          <SettingRow icon={Pencil} label="Edit profile" onClick={() => api.push({ name: "edit" })} />
        </SettingsGroup>

        <section>
          <h2 className="text-sm font-bold sw-muted mb-2 px-1">Leaderboard visibility</h2>
          <VisibilityPicker value={a.visibility} onChange={(v) => {
            api.updateAccount({ visibility: v });
            api.toast({ icon: VISIBILITY.find((x) => x.id === v).Icon, title: v === "hidden" ? "You're hidden from the leaderboard" : v === "tier" ? "Showing your tier instead of your score" : "Your rank and score are public" });
          }} />
        </section>

        <SettingsGroup title="Discovery">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold mb-2">Show me</p>
            <Segmented size="sm" value={a.showMe} onChange={(v) => api.updateAccount({ showMe: v })} options={SHOW_ME.map((s) => ({ id: s.id, label: s.label }))} label="Show me" />
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold">Age range</p><span className="text-sm font-bold sw-num">{f.ageMin} to {f.ageMax}</span></div>
            <input type="range" className="sw-range" min={18} max={24} value={f.ageMin} aria-label="Minimum age"
              onChange={(e) => { const v = Number(e.target.value); api.setFilters({ ...f, ageMin: v, ageMax: Math.max(v, f.ageMax) }); }} />
            <input type="range" className="sw-range" min={18} max={24} value={f.ageMax} aria-label="Maximum age"
              onChange={(e) => { const v = Number(e.target.value); api.setFilters({ ...f, ageMax: v, ageMin: Math.min(v, f.ageMin) }); }} />
          </div>
          <SettingRow icon={Pause} label="Pause my account" sub="Hide from Discover and the leaderboard. Chats keep working.">
            <Toggle checked={state.paused} onChange={api.setPaused} label="Pause my account" />
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <SettingRow icon={Heart} label="New matches"><Toggle checked={n.matches} onChange={(v) => api.setNotification("matches", v)} label="New match notifications" /></SettingRow>
          <SettingRow icon={MessageCircle} label="Messages"><Toggle checked={n.messages} onChange={(v) => api.setNotification("messages", v)} label="Message notifications" /></SettingRow>
          <SettingRow icon={TrendingUp} label="Rank changes" sub="Only when you climb"><Toggle checked={n.rank} onChange={(v) => api.setNotification("rank", v)} label="Rank change notifications" /></SettingRow>
          <SettingRow icon={Moon} label="Swirl Night reminders"><Toggle checked={n.swirlNight} onChange={(v) => api.setNotification("swirlNight", v)} label="Swirl Night reminders" /></SettingRow>
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <SettingRow icon={state.theme === "dark" ? Moon : Sun} label="Dark mode">
            <Toggle checked={state.theme === "dark"} onChange={(v) => api.setTheme(v ? "dark" : "light")} label="Dark mode" />
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title="Safety">
          <SettingRow icon={LifeBuoy} label="Safety Center" sub="First-date tips and support" onClick={() => api.push({ name: "safety" })} />
          <SettingRow icon={Ban} label="Blocked people" sub={`${state.blocked.length} blocked`} onClick={() => api.push({ name: "blocked" })} />
        </SettingsGroup>

        <section>
          <h2 className="text-sm font-bold sw-muted mb-2 px-1">Prototype controls</h2>
          <div className="rounded-3xl sw-surface border sw-border p-4"><DevControls state={state} api={api} /></div>
        </section>

        <SettingsGroup title="Account actions">
          <SettingRow icon={LogOut} label="Log out" onClick={() => setLogoutOpen(true)} />
          <SettingRow icon={Trash2} label="Delete account" sub="Permanently removes your profile, matches, and score" danger onClick={() => { setDeleteText(""); setDeleteOpen(true); }} />
        </SettingsGroup>
        <p className="text-center text-xs sw-faint">Swirl prototype. All profiles are fictional.</p>
      </div>

      <Dialog open={logoutOpen} title="Log out of Swirl?" body="Your profile, matches, and score stay saved. Log back in anytime." confirmLabel="Log out" tone="primary"
        onCancel={() => setLogoutOpen(false)} onConfirm={() => { setLogoutOpen(false); api.logout(); }} />
      <Dialog open={deleteOpen} title="Delete your account?" confirmLabel="Delete forever" onCancel={() => setDeleteOpen(false)} confirmDisabled={deleteText.trim().toUpperCase() !== "DELETE"}
        body="This permanently deletes your profile, photos, matches, messages, and Swirl Score. It can't be undone."
        onConfirm={() => { setDeleteOpen(false); api.deleteAccount(); }}>
        <label className="block text-sm font-semibold mt-4" htmlFor="delete-confirm">Type DELETE to confirm</label>
        <input id="delete-confirm" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" className={cx(inputCls(false), "mt-2")} />
      </Dialog>
    </div>
  );
}

function CopyRow({ label, value, sub, onCopied }) {
  const [state, setState] = useState("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      if (onCopied) onCopied();
    } catch (e) {
      setState("select");
    }
    setTimeout(() => setState("idle"), 2200);
  };
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="h-9 w-9 rounded-full sw-surface-2 flex items-center justify-center shrink-0"><Phone size={16} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-sm sw-num select-all" style={{ userSelect: "all" }}>{value}</span>
        {sub && <span className="block text-xs sw-muted">{sub}</span>}
      </span>
      <Btn size="sm" variant="secondary" icon={state === "copied" ? Check : Copy} onClick={copy}>{state === "copied" ? "Copied" : state === "select" ? "Select it" : "Copy"}</Btn>
    </div>
  );
}

function SafetyCenter({ state, api, matchId }) {
  const solo = state.matches.filter((m) => m.kind === "solo" && state.users[m.userIds[0]]);
  const [mid, setMid] = useState(matchId && solo.some((m) => m.id === matchId) ? matchId : solo[0] ? solo[0].id : "");
  const match = solo.find((m) => m.id === mid);
  const partner = match ? state.users[match.userIds[0]] : null;
  const [spotId, setSpotId] = useState((match && match.ideas && match.ideas[0]) || DATE_SPOTS[0].id);
  const [when, setWhen] = useState("Thursday at 7 PM");
  const [manual, setManual] = useState("");
  useEffect(() => { if (match && match.ideas && match.ideas[0]) setSpotId(match.ideas[0]); }, [mid]); // eslint-disable-line react-hooks/exhaustive-deps
  const spot = SPOTS_BY_ID[spotId];
  const plan = partner ? `Date plans: I'm meeting ${partner.name} (${partner.major}, CU Boulder) at ${spot.name} on ${when || "a time TBD"}. I'll text you when I'm home. Sent from Swirl.` : "";
  const sharePlan = async () => {
    const r = await shareOrCopy(plan, "My date plans");
    if (r === "manual") setManual(plan);
    else if (r === "copied") api.toast({ icon: Copy, title: "Plans copied", body: "Paste them into a text to a friend." });
    else if (r === "shared") api.toast({ icon: Share2, title: "Plans shared" });
  };
  return (
    <div className="h-full flex flex-col sw-app">
      <ScreenHeader title="Safety Center" onBack={api.pop} />
      <div className="sw-scroll flex-1 min-h-0 px-4 pb-10 flex flex-col gap-6">
        <div className="rounded-3xl sw-grad p-5 relative overflow-hidden">
          <Shield size={120} className="absolute -right-6 -bottom-6" style={{ color: "rgba(255,255,255,.15)" }} />
          <h2 className="sw-display text-3xl font-extrabold text-white leading-tight">Date smart.<br />Swirl safe.</h2>
          <p className="text-sm text-white mt-2 leading-relaxed" style={{ maxWidth: 260 }}>Every Swirl account is a verified .edu student, 18 or older. Here's how to keep first dates easy and safe.</p>
        </div>

        <section>
          <h2 className="text-sm font-bold sw-muted mb-2 px-1">First-date tips</h2>
          <div className="rounded-3xl sw-surface border sw-border divide-y" style={{ borderColor: "var(--line)" }}>
            {SAFETY_TIPS.map((t) => (
              <div key={t.title} className="flex gap-3 px-4 py-3.5">
                <ShieldCheck size={18} className="shrink-0 mt-0.5" style={{ color: "#8F5BFF" }} />
                <div>
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="text-sm sw-muted mt-0.5 leading-relaxed">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold sw-muted mb-2 px-1">Share your date plans</h2>
          <div className="rounded-3xl sw-surface border sw-border p-4 flex flex-col gap-3">
            {solo.length === 0 ? (
              <p className="text-sm sw-muted">Once you match with someone, you can send your plans to a friend from here.</p>
            ) : (
              <>
                <Field label="Who you're meeting" htmlFor="sp-match">
                  <select id="sp-match" value={mid} onChange={(e) => setMid(e.target.value)} className={inputCls(false)}>
                    {solo.map((m) => <option key={m.id} value={m.id}>{state.users[m.userIds[0]].name}</option>)}
                  </select>
                </Field>
                <Field label="Where" htmlFor="sp-spot">
                  <select id="sp-spot" value={spotId} onChange={(e) => setSpotId(e.target.value)} className={inputCls(false)}>
                    {DATE_SPOTS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.area})</option>)}
                  </select>
                </Field>
                <Field label="When" htmlFor="sp-when">
                  <input id="sp-when" value={when} onChange={(e) => setWhen(e.target.value)} maxLength={60} className={inputCls(false)} />
                </Field>
                <p className="text-sm rounded-2xl sw-surface-2 p-3 leading-relaxed">{plan}</p>
                <Btn icon={Share2} onClick={sharePlan}>Send to a friend</Btn>
                {manual && <textarea readOnly rows={3} value={manual} onFocus={(e) => e.target.select()} className="sw-input w-full rounded-2xl p-3 text-sm resize-none" aria-label="Plans to copy" />}
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold sw-muted mb-2 px-1">Get help</h2>
          <div className="rounded-3xl sw-surface border sw-border divide-y" style={{ borderColor: "var(--line)" }}>
            <CopyRow label="Emergency" value="911" sub="If you're in danger, call now." />
            <CopyRow label="CU Boulder Police (non-emergency)" value="303-492-6666" sub="Answered 24/7" />
            <CopyRow label="CU Boulder Office of Victim Assistance" value="303-492-8855" sub="Support after a hard experience. Press 2 after hours." />
            <CopyRow label="RAINN National Sexual Assault Hotline" value="800-656-4673" sub="Free, confidential, 24/7" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold sw-muted mb-2 px-1">Report or block</h2>
          <div className="rounded-3xl sw-surface border sw-border divide-y" style={{ borderColor: "var(--line)" }}>
            {solo.slice(0, 5).map((m) => {
              const u = state.users[m.userIds[0]];
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar person={u} size={36} />
                  <span className="flex-1 text-sm font-semibold truncate">{u.name}</span>
                  <IconBtn label={`Report ${u.name}`} size={36} onClick={() => api.report(u.id)}><Flag size={16} /></IconBtn>
                  <IconBtn label={`Block ${u.name}`} size={36} onClick={() => api.confirmBlock(u.id)}><Ban size={16} /></IconBtn>
                </div>
              );
            })}
            <SettingRow icon={Ban} label="Blocked people" sub={`${state.blocked.length} blocked`} onClick={() => api.push({ name: "blocked" })} />
          </div>
        </section>
      </div>
    </div>
  );
}

function BlockedScreen({ state, api }) {
  const list = state.blocked.map((id) => state.users[id]).filter(Boolean);
  return (
    <div className="h-full flex flex-col sw-app">
      <ScreenHeader title="Blocked people" onBack={api.pop} />
      <div className="sw-scroll flex-1 min-h-0 px-4 pb-10">
        {list.length === 0 ? (
          <EmptyState icon={Ban} title="You haven't blocked anyone" body="Blocked people can't see you in Discover, on the leaderboard, or in chat. They're never told." />
        ) : (
          <div className="rounded-3xl sw-surface border sw-border divide-y" style={{ borderColor: "var(--line)" }}>
            {list.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar person={u} size={40} />
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{u.name}</p><p className="text-xs sw-muted truncate">{u.major}</p></div>
                <Btn size="sm" variant="secondary" onClick={() => api.unblock(u.id)}>Unblock</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const GROUP_NAME_IDEAS = ["The Hill Crew", "Libby Third Floor", "Sunday Brunch Club", "Flatirons Four"];

function GroupManager({ state, api }) {
  const g = state.group;
  const [name, setName] = useState(g ? g.name : "");
  const [disbandOpen, setDisbandOpen] = useState(false);
  const size = g ? 1 + g.members.length + g.pending.length : 1;
  const full = size >= 3;
  if (!g) {
    return (
      <div className="h-full flex flex-col sw-app">
        <ScreenHeader title="Start a group" onBack={api.pop} />
        <div className="sw-scroll flex-1 min-h-0 px-5 pb-10">
          <StepIntro title="Swipe as a squad" body="Groups are up to 3 people. You swipe together on other groups, and group matches get a group chat. Group swipes don't affect anyone's Swirl Score." />
          <Field label="Group name" htmlFor="grp-name">
            <input id="grp-name" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder="The Hill Crew" className={inputCls(false)} />
          </Field>
          <div className="flex flex-wrap gap-2 mt-3">{GROUP_NAME_IDEAS.map((n) => <Chip key={n} small selected={name === n} onClick={() => setName(n)}>{n}</Chip>)}</div>
          <Btn size="lg" className="w-full mt-8" icon={Users} onClick={() => api.createGroup(name.trim() || GROUP_NAME_IDEAS[0])}>Create group</Btn>
        </div>
      </div>
    );
  }
  const people = [...g.members.map((id) => ({ id, joined: true })), ...g.pending.map((id) => ({ id, joined: false }))];
  const groupMatches = state.matches.filter((m) => m.kind === "group").length;
  return (
    <div className="relative h-full flex flex-col sw-app">
      <ScreenHeader title="Your group" onBack={api.pop} />
      <div className="sw-scroll flex-1 min-h-0 px-4 pb-10 flex flex-col gap-6">
        <Field label="Group name" htmlFor="grp-rename">
          <div className="flex gap-2">
            <input id="grp-rename" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} className={inputCls(false)} />
            <Btn variant="secondary" disabled={!name.trim() || name.trim() === g.name} onClick={() => { api.renameGroup(name.trim()); api.toast({ icon: Check, title: "Group renamed" }); }}>Save</Btn>
          </div>
        </Field>
        <SettingsGroup title={`Members (${size} of 3)`} note={groupMatches ? `${groupMatches} group ${groupMatches === 1 ? "match" : "matches"} so far.` : "Swipe on groups in Discover once someone joins."}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar person={state.account} size={40} />
            <div className="flex-1"><p className="font-semibold">{state.account.name} (you)</p><p className="text-xs sw-muted">Group creator</p></div>
          </div>
          {people.map(({ id, joined }) => {
            const f = FRIENDS_BY_ID[id];
            return (
              <div key={id} className="flex items-center gap-3 px-4 py-3">
                <Avatar person={f} size={40} />
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{f.name}</p><p className="text-xs sw-muted">{joined ? "Joined" : "Invite sent…"}</p></div>
                <Btn size="sm" variant="secondary" onClick={() => api.removeFromGroup(id)}>Remove</Btn>
              </div>
            );
          })}
        </SettingsGroup>
        <SettingsGroup title="Invite friends" note={full ? "Groups max out at 3 people. Remove someone to invite another friend." : "Friends join instantly in this prototype."}>
          {FRIENDS.filter((f) => !g.members.includes(f.id) && !g.pending.includes(f.id)).map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar person={f} size={40} />
              <div className="flex-1 min-w-0"><p className="font-semibold truncate">{f.name} {f.last}</p><p className="text-xs sw-muted truncate">{f.note}</p></div>
              <Btn size="sm" icon={UserPlus} disabled={full} onClick={() => api.inviteFriend(f.id)}>Invite</Btn>
            </div>
          ))}
        </SettingsGroup>
        <Btn variant="outline" icon={Trash2} onClick={() => setDisbandOpen(true)}>Disband group</Btn>
      </div>
      <Dialog open={disbandOpen} title={`Disband ${g.name}?`} body="Your group chats stay, but you'll stop swiping as a group." confirmLabel="Disband"
        onCancel={() => setDisbandOpen(false)} onConfirm={() => { setDisbandOpen(false); api.disbandGroup(); }} />
    </div>
  );
}

/* =================== 13. APP SHELL: STATE, SIMULATION, NAV =================== */

const PHONE_W = 390;
const PHONE_H = 844;
const TAB_H = 74;
const PTS_KEY = { likes: "likePts", supers: "superPts", passes: "passPts", replies: "replyPts", dates: "datePts", ghosts: "ghostPts" };

function initialState() {
  return {
    stage: "splash", // splash | onboarding | blocked | app
    theme: "dark",
    ageLocked: false,
    notice: null,
    account: null,
    users: seedUsers(),
    swipes: {}, // my swipes: id -> like | super | pass
    swipedMe: {}, // swipes I've received from real profiles: id -> like | super | pass
    matches: [],
    blocked: [],
    reports: [],
    typing: {},
    my: freshMy(Date.now()),
    filters: DEFAULT_FILTERS,
    notifications: { matches: true, messages: true, rank: true, swirlNight: true },
    paused: false,
    offline: false,
    simSpeed: "normal",
    swirlOverride: null,
    swirlOverrideAt: 0,
    season: { number: 1 },
    archive: null,
    group: null,
    groupSwipes: {},
    rivalry: JSON.parse(JSON.stringify(RIVALRY_SEED)),
    discoverMode: "solo",
    celebrate: null,
  };
}

function bumpRivalry(r, id, inc) {
  const cur = r[id];
  const next = { ...cur };
  Object.keys(inc).forEach((k) => { next[k] = cur[k] + inc[k]; });
  return { ...r, [id]: next };
}

function withMatch(s, match, celebrate) {
  if (!match || s.matches.some((m) => m.id === match.id)) return s;
  return { ...s, matches: [match, ...s.matches], rivalry: bumpRivalry(s.rivalry, "cu", { matches: 1 }), celebrate: celebrate ? match.id : s.celebrate };
}

/** Change my score (with the 500 floor), log it in the breakdown, track the top tier reached. */
function withMyDelta(s, delta, statKey, ev) {
  const score = applyDelta(s.my.score, delta);
  const d = score - s.my.score;
  const stats = { ...s.my.stats };
  if (statKey) { stats[statKey] += 1; stats[PTS_KEY[statKey]] += d; }
  const t = tierFor(score);
  const topTier = TIER_INDEX[t.id] > TIER_INDEX[s.my.topTier] ? t.id : s.my.topTier;
  const activity = ev ? [{ ...ev, delta: d }, ...s.my.activity].slice(0, 30) : s.my.activity;
  return { ...s, my: { ...s.my, score, weekGain: s.my.weekGain + d, stats, activity, topTier } };
}

const updateMatch = (s, id, fn) => ({ ...s, matches: s.matches.map((m) => (m.id === id ? fn(m) : m)) });

function reducer(s, a) {
  switch (a.type) {
    case "PATCH":
      return { ...s, ...a.patch };
    case "START_ACCOUNT": {
      const swipes = {};
      const swipedMe = {};
      a.matches.forEach((m) => { swipes[m.userIds[0]] = "like"; swipedMe[m.userIds[0]] = "like"; });
      return { ...initialState(), theme: s.theme, ageLocked: s.ageLocked, simSpeed: s.simSpeed, stage: "app", account: a.account, my: a.my, matches: a.matches, swipes, swipedMe };
    }
    case "LOGOUT":
      return { ...s, stage: "splash", notice: null, celebrate: null, typing: {} };
    case "DELETE_ACCOUNT":
      return { ...initialState(), theme: s.theme, ageLocked: s.ageLocked, notice: "Your account and all of its data were deleted." };
    case "UPDATE_ACCOUNT":
      return { ...s, account: { ...s.account, ...a.patch } };
    case "SWIPE": {
      const t = s.users[a.id];
      if (!t || s.swipes[a.id]) return s;
      const ns = applyDelta(t.score, swipeDelta(a.dir, s.my.score, t.score));
      let next = {
        ...s,
        swipes: { ...s.swipes, [a.id]: a.dir },
        users: { ...s.users, [a.id]: { ...t, score: ns, weekGain: t.weekGain + (ns - t.score) } },
        rivalry: bumpRivalry(s.rivalry, "cu", { swipes: 1 }),
      };
      if (a.markLikedMe) next.swipedMe = { ...next.swipedMe, [a.id]: "like" };
      return withMatch(next, a.match, a.celebrate);
    }
    case "RECEIVE_SWIPE": {
      if (!s.account) return s;
      const raw = swipeDelta(a.kind, a.fromScore, s.my.score);
      const key = a.kind === "like" ? "likes" : a.kind === "super" ? "supers" : "passes";
      const ev = a.kind === "pass" ? null : { id: a.eid, kind: a.kind, fromTier: tierFor(a.fromScore).id, ts: a.ts };
      let next = withMyDelta(s, raw, key, ev);
      next = { ...next, rivalry: bumpRivalry(next.rivalry, "cu", { swipes: 1 }) };
      if (a.fromId) next.swipedMe = { ...next.swipedMe, [a.fromId]: a.kind };
      return withMatch(next, a.match, a.celebrate);
    }
    case "WORLD_TICK": {
      const users = { ...s.users };
      a.events.forEach((ev) => {
        const from = users[ev.from];
        const to = users[ev.to];
        if (!from || !to) return;
        const ns = applyDelta(to.score, swipeDelta(ev.kind, from.score, to.score));
        users[ev.to] = { ...to, score: ns, weekGain: to.weekGain + (ns - to.score) };
      });
      let rivalry = s.rivalry;
      Object.keys(a.rivalry).forEach((id) => { rivalry = bumpRivalry(rivalry, id, a.rivalry[id]); });
      return { ...s, users, rivalry };
    }
    case "SEND_MESSAGE": {
      const m = s.matches.find((x) => x.id === a.matchId);
      if (!m) return s;
      let next = s;
      let msgs = [...m.messages, a.message];
      if (a.bonus && !m.replyBonus) {
        msgs = [...msgs, { id: a.bonusId, from: "system", text: `+${SCORING.REPLY_24H} Swirl Score for replying within 24 hours`, ts: a.message.ts + 1 }];
        next = withMyDelta(next, SCORING.REPLY_24H, "replies", { id: a.bonusId, kind: "reply", ts: a.message.ts });
      }
      return updateMatch(next, m.id, (x) => ({ ...x, messages: msgs, replyBonus: x.replyBonus || !!a.bonus, lastActivity: a.message.ts }));
    }
    case "RETRY_MESSAGE": {
      const m = s.matches.find((x) => x.id === a.matchId);
      if (!m) return s;
      let next = s;
      let msgs = m.messages.map((x) => (x.id === a.msgId ? { ...x, status: "sent", ts: a.ts } : x));
      if (a.bonus && !m.replyBonus) {
        msgs = [...msgs, { id: a.bonusId, from: "system", text: `+${SCORING.REPLY_24H} Swirl Score for replying within 24 hours`, ts: a.ts + 1 }];
        next = withMyDelta(next, SCORING.REPLY_24H, "replies", { id: a.bonusId, kind: "reply", ts: a.ts });
      }
      return updateMatch(next, m.id, (x) => ({ ...x, messages: msgs, replyBonus: x.replyBonus || !!a.bonus, lastActivity: a.ts }));
    }
    case "RECEIVE_MESSAGE":
      if (!s.matches.some((x) => x.id === a.matchId)) return s;
      return updateMatch(s, a.matchId, (x) => ({ ...x, messages: [...x.messages, a.message], unread: a.active ? 0 : x.unread + 1, lastActivity: a.message.ts }));
    case "SET_TYPING": {
      const typing = { ...s.typing };
      if (a.userId) typing[a.matchId] = a.userId;
      else delete typing[a.matchId];
      return { ...s, typing };
    }
    case "MARK_READ":
      return updateMatch(s, a.matchId, (x) => ({ ...x, unread: 0 }));
    case "UNMATCH": {
      const typing = { ...s.typing };
      delete typing[a.matchId];
      let next = { ...s, matches: s.matches.filter((x) => x.id !== a.matchId), typing, celebrate: s.celebrate === a.matchId ? null : s.celebrate };
      if (a.ghost) next = withMyDelta(next, SCORING.GHOST_UNMATCH, "ghosts", { id: a.eid, kind: "ghost", ts: a.ts });
      return next;
    }
    case "BLOCK": {
      const gone = s.matches.filter((m) => m.userIds.includes(a.userId)).map((m) => m.id);
      const typing = { ...s.typing };
      gone.forEach((id) => delete typing[id]);
      return {
        ...s,
        blocked: s.blocked.includes(a.userId) ? s.blocked : [...s.blocked, a.userId],
        matches: s.matches.filter((m) => !gone.includes(m.id)),
        typing,
        celebrate: gone.includes(s.celebrate) ? null : s.celebrate,
      };
    }
    case "UNBLOCK":
      return { ...s, blocked: s.blocked.filter((id) => id !== a.userId) };
    case "REPORT":
      return { ...s, reports: [...s.reports, a.report] };
    case "DATE_CONFIRM": {
      const m = s.matches.find((x) => x.id === a.matchId);
      if (!m || m.date.done || m.date[a.who]) return s;
      const date = { ...m.date, [a.who]: true };
      const msgs = [...m.messages];
      let next = s;
      if (a.who === "me" && !date.them) msgs.push({ id: a.ids[0], from: "system", text: `You confirmed a date. Waiting for ${a.name} to confirm.`, ts: a.ts });
      if (date.me && date.them) {
        date.done = true;
        msgs.push({ id: a.ids[1], from: "system", text: `You both confirmed a date. +${SCORING.DATE_CONFIRMED} Swirl Score each`, ts: a.ts + 1 });
        next = withMyDelta(next, SCORING.DATE_CONFIRMED, "dates", { id: a.ids[1], kind: "date", ts: a.ts });
        const u = next.users[m.userIds[0]];
        if (u) {
          const ns = applyDelta(u.score, SCORING.DATE_CONFIRMED);
          next = { ...next, users: { ...next.users, [u.id]: { ...u, score: ns, weekGain: u.weekGain + (ns - u.score) } } };
        }
        next = { ...next, rivalry: bumpRivalry(next.rivalry, "cu", { dates: 1 }) };
      }
      return updateMatch(next, m.id, (x) => ({ ...x, date, messages: msgs, lastActivity: a.ts }));
    }
    case "SET_MY":
      return { ...s, my: a.my };
    case "PEAK":
      return { ...s, my: { ...s.my, peakRank: a.rank, peakAt: a.at } };
    case "SEASON_RESET": {
      const users = {};
      Object.values(s.users).forEach((u) => { users[u.id] = { ...u, score: SCORING.START, scoreYesterday: SCORING.START, weekGain: 0 }; });
      return { ...s, users, my: { ...freshMy(a.ts), joinedAt: s.my.joinedAt }, season: { number: s.season.number + 1 }, archive: a.archive };
    }
    case "GROUP_CREATE":
      return { ...s, group: { name: a.name, members: [], pending: [] } };
    case "GROUP_RENAME":
      return s.group ? { ...s, group: { ...s.group, name: a.name } } : s;
    case "GROUP_INVITE":
      if (!s.group || 1 + s.group.members.length + s.group.pending.length >= 3) return s;
      return { ...s, group: { ...s.group, pending: [...s.group.pending, a.id] } };
    case "GROUP_JOIN":
      if (!s.group || !s.group.pending.includes(a.id)) return s;
      return { ...s, group: { ...s.group, pending: s.group.pending.filter((x) => x !== a.id), members: [...s.group.members, a.id] } };
    case "GROUP_REMOVE":
      if (!s.group) return s;
      return { ...s, group: { ...s.group, pending: s.group.pending.filter((x) => x !== a.id), members: s.group.members.filter((x) => x !== a.id) } };
    case "GROUP_DISBAND":
      return { ...s, group: null };
    case "GROUP_SWIPE":
      return withMatch({ ...s, groupSwipes: { ...s.groupSwipes, [a.gid]: a.dir } }, a.match, a.celebrate);
    case "RESET_DECK": {
      const swipes = {};
      Object.entries(s.swipes).forEach(([id, dir]) => { if (dir !== "pass") swipes[id] = dir; });
      return { ...s, swipes };
    }
    case "RESET_GROUP_DECK": {
      const groupSwipes = {};
      Object.entries(s.groupSwipes).forEach(([id, dir]) => { if (dir !== "pass") groupSwipes[id] = dir; });
      return { ...s, groupSwipes };
    }
    default:
      return s;
  }
}

function TabBar({ tab, onChange, unread }) {
  const items = [
    { id: "discover", label: "Discover", Icon: Flame },
    { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
    { id: "matches", label: "Matches", Icon: MessageCircle, badge: unread },
    { id: "profile", label: "Profile", Icon: User },
  ];
  return (
    <nav className="absolute left-0 right-0 bottom-0 z-10 border-t sw-border sw-app" style={{ height: TAB_H }} aria-label="Main">
      <div className="h-full grid grid-cols-4 pb-2">
        {items.map((it) => {
          const on = tab === it.id;
          const Icon = it.Icon;
          return (
            <button key={it.id} type="button" onClick={() => onChange(it.id)} aria-current={on ? "page" : undefined} aria-label={it.badge ? `${it.label}, ${it.badge} unread` : it.label} className="relative flex flex-col items-center justify-center gap-1 transition active:scale-95">
              <span className="relative">
                <Icon size={24} strokeWidth={on ? 2.4 : 2} stroke={on ? "url(#sw-brand)" : "currentColor"} className={on ? "" : "sw-faint"} />
                {it.badge ? (
                  <span aria-hidden="true" className="absolute -top-1.5 h-4 px-1 rounded-full sw-grad text-xs font-bold flex items-center justify-center sw-num" style={{ left: 16, minWidth: 16, fontSize: 10 }}>{it.badge > 9 ? "9+" : it.badge}</span>
                ) : null}
              </span>
              <span className={cx("text-xs font-semibold", on ? "sw-text" : "sw-faint")}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StatusBar() {
  const now = useNow(15000);
  return (
    <div className="relative h-11 shrink-0 flex items-center justify-between px-8 text-sm font-semibold sw-app" aria-hidden="true">
      <span className="sw-num">{new Date(now).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/, "")}</span>
      <span className="absolute left-1/2 top-2 -translate-x-1/2 h-7 w-28 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 4.2a9.5 9.5 0 0 1 13 0" /><path d="M4 7a5.8 5.8 0 0 1 8 0" /><circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none" /></svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x="0.5" y="0.5" width="22" height="11" rx="3.2" stroke="currentColor" opacity=".45" /><rect x="2.2" y="2.2" width="16" height="7.6" rx="1.8" fill="currentColor" /><rect x="23.6" y="4" width="1.8" height="4" rx=".9" fill="currentColor" opacity=".45" /></svg>
      </span>
    </div>
  );
}

function SidePanel({ state, api }) {
  return (
    <aside className="rounded-3xl sw-surface border sw-border p-5 sw-text sw-scroll" style={{ width: 300, maxHeight: "calc(100vh - 48px)" }} aria-label="Prototype controls">
      <Wordmark size={22} />
      <p className="text-sm sw-muted mt-3 leading-relaxed">Clickable prototype. Every profile is fictional, and everything lives in memory until you reload.</p>
      <h2 className="text-sm font-bold sw-muted mt-6 mb-3">Prototype controls</h2>
      <DevControls state={state} api={api} />
      <h2 className="text-sm font-bold sw-muted mt-6 mb-2">Try this</h2>
      <ul className="text-sm leading-relaxed flex flex-col gap-1.5 sw-muted">
        <li>Swipe right on a few people until you get a match.</li>
        <li>Open the Leaderboard and watch your rank move as students swipe on you.</li>
        <li>Turn on Swirl Night to see the drop.</li>
        <li>Run a semester reset to get your season recap.</li>
      </ul>
      <h2 className="text-sm font-bold sw-muted mt-6 mb-2">Keyboard on Discover</h2>
      <div className="flex gap-2 text-xs font-semibold">
        <span className="rounded-lg sw-surface-2 px-2 py-1">← Pass</span>
        <span className="rounded-lg sw-surface-2 px-2 py-1">→ Like</span>
        <span className="rounded-lg sw-surface-2 px-2 py-1">↑ Super like</span>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-semibold">Dark mode</span>
        <Toggle checked={state.theme === "dark"} onChange={(v) => api.setTheme(v ? "dark" : "light")} label="Dark mode" />
      </div>
    </aside>
  );
}

export default function SwirlApp() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [tab, setTabState] = useState("discover");
  const [stack, setStack] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [recap, setRecap] = useState(null);
  const [layerEl, setLayerEl] = useState(null);
  const vp = useViewport();

  const stateRef = useRef(state);
  stateRef.current = state;
  const uiRef = useRef({});
  uiRef.current = { tab, stack, recap, reportTarget, confirm };
  const timers = useRef(new Set());
  const replyPending = useRef({});
  const lastRankToast = useRef(0);
  const fns = useRef({});

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => { timers.current.delete(id); fn(); }, ms);
    timers.current.add(id);
    return id;
  }, []);
  const toast = useCallback((t) => {
    const id = uid("t");
    setToasts((list) => [...list.slice(-2), { ...t, id }]);
    later(() => setToasts((list) => list.filter((x) => x.id !== id)), t.duration || 3600);
  }, [later]);
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  const board = useMemo(() => (state.account ? getBoard(state, "campus") : null), [state.users, state.my, state.blocked, state.account, state.paused]); // eslint-disable-line react-hooks/exhaustive-deps
  const myRank = board && board.mine ? board.mine.rank : null;
  const myRankRef = useRef(myRank);
  myRankRef.current = myRank;

  /* ---------- helpers that always see the latest state (called from timers) ---------- */
  const isChatOpen = (matchId) => {
    const st = uiRef.current.stack;
    const top = st[st.length - 1];
    return !!top && top.name === "chat" && top.matchId === matchId;
  };
  const canCelebrate = () => {
    const ui = uiRef.current;
    return ui.tab === "discover" && ui.stack.length === 0 && !ui.recap && !ui.reportTarget && !ui.confirm;
  };
  const makeMatch = (st, userId) => {
    const u = st.users[userId];
    const now = Date.now();
    return {
      id: uid("m"), kind: "solo", userIds: [userId], friendIds: [], name: null, createdAt: now, messages: [], unread: 0, replyBonus: false,
      date: { me: false, them: false, done: false }, ideas: pickDateIdeas(st.account, u, `${userId}-${st.account.name}`), lastActivity: now,
    };
  };

  fns.current.openChat = (matchId, draft) => {
    dispatch({ type: "PATCH", patch: { celebrate: null } });
    setTabState("matches");
    setStack([{ name: "chat", matchId, draft: draft || "" }]);
  };

  fns.current.deliverReply = (matchId, myText, responderId, fixedText, isFollowUp) => {
    const st = stateRef.current;
    const m = st.matches.find((x) => x.id === matchId);
    if (!m || st.offline) return;
    if (replyPending.current[matchId] && !isFollowUp) return;
    const pool = m.kind === "group" ? [...m.userIds, ...(Math.random() < 0.3 ? m.friendIds : [])] : m.userIds;
    const rid = responderId || pick(pool);
    if (st.blocked.includes(rid)) return;
    const person = personFor(rid, st);
    if (!person) return;
    const text = fixedText || craftReply(myText || "", person, m, st);
    replyPending.current[matchId] = true;
    const typingMs = clamp(900 + text.length * 30, 1200, 3200);
    later(() => {
      if (stateRef.current.matches.some((x) => x.id === matchId)) dispatch({ type: "SET_TYPING", matchId, userId: rid });
    }, rand(500, 1000));
    later(() => {
      replyPending.current[matchId] = false;
      const cur = stateRef.current;
      dispatch({ type: "SET_TYPING", matchId, userId: null });
      if (!cur.matches.some((x) => x.id === matchId) || cur.blocked.includes(rid)) return;
      const active = isChatOpen(matchId);
      dispatch({ type: "RECEIVE_MESSAGE", matchId, active, message: { id: uid("msg"), from: rid, text, ts: Date.now(), status: "sent" } });
      if (!active && cur.notifications.messages) {
        toast({ icon: MessageCircle, title: person.name, body: text, action: { label: "Reply", onClick: () => fns.current.openChat(matchId) } });
      }
      if (!fixedText && !isFollowUp && Math.random() < 0.22) {
        later(() => fns.current.deliverReply(matchId, "", rid, pick(GENERIC_REPLIES.filter((r) => !r.includes("{interest}"))), true), 1400);
      }
    }, 1000 + typingMs);
  };

  const maybeOpener = (matchId, userId) => {
    if (Math.random() < 0.5) later(() => fns.current.deliverReply(matchId, null, userId, pick(OPENERS)), rand(8000, 15000));
  };

  fns.current.receiveIncoming = (forced) => {
    const st = stateRef.current;
    if (st.stage !== "app" || !st.account || st.paused) return;
    if (forced && st.blocked.includes(forced.fromId)) return;
    const live = swirlNightStatus(Date.now(), st.swirlOverride, st.swirlOverrideAt).live;
    const inc = forced || decideIncoming(st, live);
    let match = null;
    let celebrate = false;
    if (inc.fromId && inc.kind !== "pass") {
      const mine = st.swipes[inc.fromId];
      const already = st.matches.some((m) => m.kind === "solo" && m.userIds[0] === inc.fromId);
      if ((mine === "like" || mine === "super") && !already && !st.blocked.includes(inc.fromId)) {
        match = makeMatch(st, inc.fromId);
        celebrate = canCelebrate();
      }
    }
    dispatch({ type: "RECEIVE_SWIPE", ...inc, eid: uid("ev"), ts: Date.now(), match, celebrate });
    if (match) {
      maybeOpener(match.id, inc.fromId);
      if (!celebrate && st.notifications.matches) {
        toast({ icon: Heart, title: `It's a Swirl! You and ${st.users[inc.fromId].name} matched`, action: { label: "Say hi", onClick: () => fns.current.openChat(match.id) } });
      }
    } else if (inc.kind === "super" && st.notifications.matches) {
      const inDeck = inc.fromId && !st.swipes[inc.fromId] && compatible(st.account, st.users[inc.fromId]);
      toast({ icon: Star, title: "Someone super liked you", body: inDeck ? "They're at the top of your deck." : `Worth +${swipeDelta("super", inc.fromScore, st.my.score)} to your Swirl Score.` });
    }
  };

  /* ---------- the API every screen uses ---------- */
  const api = useMemo(() => ({
    toast,
    push: (r) => setStack((st) => [...st, r]),
    pop: () => setStack((st) => st.slice(0, -1)),
    setTab: (t) => { setTabState(t); setStack([]); },
    openChat: (id, draft) => fns.current.openChat(id, draft),
    setTheme: (theme) => dispatch({ type: "PATCH", patch: { theme } }),
    setDiscoverMode: (discoverMode) => dispatch({ type: "PATCH", patch: { discoverMode } }),
    setFilters: (filters) => dispatch({ type: "PATCH", patch: { filters } }),
    setNotification: (k, v) => dispatch({ type: "PATCH", patch: { notifications: { ...stateRef.current.notifications, [k]: v } } }),
    setPaused: (paused) => {
      dispatch({ type: "PATCH", patch: { paused } });
      toast(paused ? { icon: Pause, title: "Account paused", body: "You're hidden from Discover and the leaderboard." } : { icon: Play, title: "Welcome back", body: "You're visible again." });
    },
    setOffline: (offline) => {
      dispatch({ type: "PATCH", patch: { offline } });
      toast(offline ? { icon: WifiOff, title: "Offline mode on", body: "Discover, chat and sign-up now show their error states.", tone: "danger" } : { icon: RefreshCw, title: "Back online" });
    },
    setSimSpeed: (simSpeed) => dispatch({ type: "PATCH", patch: { simSpeed } }),
    setSwirlNight: (on) => dispatch({ type: "PATCH", patch: on ? { swirlOverride: "live", swirlOverrideAt: Date.now() } : { swirlOverride: "off" } }),
    updateAccount: (patch) => dispatch({ type: "UPDATE_ACCOUNT", patch }),
    markRead: (matchId) => dispatch({ type: "MARK_READ", matchId }),
    resetDeck: () => { dispatch({ type: "RESET_DECK" }); toast({ icon: RotateCcw, title: "Showing people you passed" }); },
    resetGroupDeck: () => dispatch({ type: "RESET_GROUP_DECK" }),

    swipe: (id, dir) => {
      const st = stateRef.current;
      const u = st.users[id];
      if (!u || st.swipes[id]) return;
      let match = null;
      let markLikedMe = false;
      if (dir !== "pass") {
        const likedMe = st.swipedMe[id] === "like" || st.swipedMe[id] === "super";
        const passedMe = st.swipedMe[id] === "pass";
        const wants = u.willLike || (dir === "super" && Math.random() < 0.3);
        if (likedMe || (!passedMe && wants && Math.random() < 0.55)) {
          match = makeMatch(st, id);
          markLikedMe = !likedMe;
        } else if (!passedMe && wants) {
          later(() => fns.current.receiveIncoming({ fromId: id, fromScore: (stateRef.current.users[id] || u).score, kind: "like" }), rand(9000, 22000));
        }
      }
      dispatch({ type: "SWIPE", id, dir, match, celebrate: !!match, markLikedMe });
      if (match) maybeOpener(match.id, id);
    },

    groupSwipe: (gid, dir) => {
      const st = stateRef.current;
      const g = GROUPS.find((x) => x.id === gid);
      if (!g || !st.group) return;
      let match = null;
      if (dir === "like" && seeded(hashStr(`${gid}-${st.group.name}`))() < 0.62) {
        const members = g.members.map((id) => st.users[id]).filter(Boolean);
        const now = Date.now();
        match = {
          id: uid("gm"), kind: "group", groupId: gid, userIds: g.members, friendIds: [...st.group.members], name: `${st.group.name} + ${g.name}`,
          createdAt: now, messages: [], unread: 0, replyBonus: true, date: { me: false, them: false, done: false },
          ideas: pickDateIdeas(st.account, { interests: members.flatMap((m) => m.interests), age: Math.min(...members.map((m) => m.age)) }, gid), lastActivity: now,
        };
      }
      dispatch({ type: "GROUP_SWIPE", gid, dir, match, celebrate: !!match });
      if (match) later(() => fns.current.deliverReply(match.id, null, pick(g.members), pick(GROUP_REPLIES)), rand(6000, 11000));
    },

    sendMessage: (matchId, text) => {
      const st = stateRef.current;
      const m = st.matches.find((x) => x.id === matchId);
      if (!m) return;
      const now = Date.now();
      const failed = st.offline;
      const bonus = !failed && !m.replyBonus && now - m.createdAt <= DAY;
      dispatch({ type: "SEND_MESSAGE", matchId, bonus, bonusId: uid("sys"), message: { id: uid("msg"), from: "me", text, ts: now, status: failed ? "failed" : "sent" } });
      if (bonus) toast({ icon: Zap, title: "+5 for replying within 24 hours", body: "Good-behavior bonus added to your Swirl Score." });
      if (!failed) fns.current.deliverReply(matchId, text);
    },

    retryMessage: (matchId, msgId) => {
      const st = stateRef.current;
      if (st.offline) { toast({ icon: WifiOff, title: "Still offline", body: "Turn off offline mode in Prototype controls, then retry.", tone: "danger" }); return; }
      const m = st.matches.find((x) => x.id === matchId);
      const msg = m && m.messages.find((x) => x.id === msgId);
      if (!msg) return;
      const bonus = !m.replyBonus && Date.now() - m.createdAt <= DAY;
      dispatch({ type: "RETRY_MESSAGE", matchId, msgId, bonus, bonusId: uid("sys"), ts: Date.now() });
      if (bonus) toast({ icon: Zap, title: "+5 for replying within 24 hours" });
      fns.current.deliverReply(matchId, msg.text);
    },

    confirmDate: (matchId) => {
      const st = stateRef.current;
      const m = st.matches.find((x) => x.id === matchId);
      if (!m || m.kind !== "solo") return;
      const u = st.users[m.userIds[0]];
      dispatch({ type: "DATE_CONFIRM", matchId, who: "me", ts: Date.now(), ids: [uid("sys"), uid("sys")], name: u.name });
      later(() => {
        const cur = stateRef.current.matches.find((x) => x.id === matchId);
        if (!cur || cur.date.done) return;
        dispatch({ type: "DATE_CONFIRM", matchId, who: "them", ts: Date.now(), ids: [uid("sys"), uid("sys")], name: u.name });
        toast({ icon: CalendarHeart, title: `${u.name} confirmed your date`, body: "+15 Swirl Score for both of you." });
      }, rand(2200, 3600));
    },

    confirmUnmatch: (matchId) => {
      const st = stateRef.current;
      const m = st.matches.find((x) => x.id === matchId);
      if (!m) return;
      const isGroup = m.kind === "group";
      const name = matchTitle(m, st);
      const ghost = !isGroup && !m.messages.some((x) => x.from === "me");
      setConfirm({
        title: isGroup ? "Leave this group chat?" : `Unmatch ${name}?`,
        body: ghost
          ? `You never replied, so unmatching now counts as ghosting: ${SCORING.GHOST_UNMATCH} Swirl Score. The chat disappears for both of you.`
          : "The chat disappears for both of you. This can't be undone.",
        confirmLabel: isGroup ? "Leave" : "Unmatch",
        onConfirm: () => {
          setConfirm(null);
          setStack((s) => s.filter((r) => !(r.name === "chat" && r.matchId === matchId)));
          dispatch({ type: "UNMATCH", matchId, ghost, eid: uid("ev"), ts: Date.now() });
          toast(ghost ? { icon: Minus, title: `Unmatched ${name}`, body: "−5 for unmatching without replying.", tone: "danger" } : { icon: Check, title: isGroup ? "You left the group chat" : `Unmatched ${name}` });
        },
      });
    },

    confirmBlock: (userId, after) => {
      const u = stateRef.current.users[userId];
      if (!u) return;
      setConfirm({
        title: `Block ${u.name}?`,
        body: `${u.name} won't see you in Discover, on the leaderboard, or in chat, and you won't see them. They're never told.`,
        confirmLabel: "Block",
        onConfirm: () => { setConfirm(null); fns.current.block(userId); if (after) after(); },
      });
    },
    unblock: (userId) => {
      dispatch({ type: "UNBLOCK", userId });
      const u = stateRef.current.users[userId];
      toast({ icon: Check, title: `Unblocked ${u ? u.name : ""}`.trim() });
    },
    report: (userId, after) => setReportTarget({ id: userId, after }),

    createGroup: (name) => { dispatch({ type: "GROUP_CREATE", name }); toast({ icon: Users, title: `${name} created`, body: "Invite up to 2 friends." }); },
    renameGroup: (name) => dispatch({ type: "GROUP_RENAME", name }),
    inviteFriend: (id) => {
      dispatch({ type: "GROUP_INVITE", id });
      later(() => {
        const st = stateRef.current;
        if (!st.group || !st.group.pending.includes(id)) return;
        dispatch({ type: "GROUP_JOIN", id });
        toast({ icon: UserPlus, title: `${FRIENDS_BY_ID[id].name} joined ${st.group.name}` });
      }, 1500);
    },
    removeFromGroup: (id) => dispatch({ type: "GROUP_REMOVE", id }),
    disbandGroup: () => { dispatch({ type: "GROUP_DISBAND" }); setStack((s) => s.filter((r) => r.name !== "group")); toast({ icon: Users, title: "Group disbanded" }); },

    openRecap: (archived) => {
      const st = stateRef.current;
      if (!st.account) return;
      setRecap(archived && st.archive ? st.archive : recapFor(st, myRankRef.current));
    },
    confirmSeasonReset: () => setConfirm({
      title: "Start a new semester?",
      body: "Prototype tool. Every score on campus resets to 1,000, the season advances, and you'll see the recap for the season that just ended.",
      confirmLabel: "Reset scores",
      onConfirm: () => {
        setConfirm(null);
        const st = stateRef.current;
        const data = { ...recapFor(st, myRankRef.current), final: true };
        lastRankToast.current = Date.now() + 5000;
        dispatch({ type: "SEASON_RESET", archive: data, ts: Date.now() });
        toast({ icon: RotateCcw, title: `${seasonLabel(st.season.number + 1)} has started`, body: "Everyone is back to 1,000." });
        setRecap(data);
      },
    }),
    backfill: () => {
      const st = stateRef.current;
      dispatch({ type: "SET_MY", my: backfillTwoWeeks(st.my, Date.now()) });
      lastRankToast.current = Date.now();
      toast({ icon: TrendingUp, title: "Fast-forwarded two weeks", body: "Your trend chart and breakdown now have history." });
    },
    devMatch: () => {
      const st = stateRef.current;
      if (!st.account) return;
      const live = swirlNightStatus(Date.now(), st.swirlOverride, st.swirlOverrideAt).live;
      const pool = buildDeck({ ...st, filters: DEFAULT_FILTERS }, live);
      if (!pool.length) { toast({ icon: Info, title: "No one left to match with", body: "Use Review people you passed in Discover first." }); return; }
      const u = pool[0];
      const match = makeMatch(st, u.id);
      setStack([]);
      setTabState("discover");
      dispatch({ type: "SWIPE", id: u.id, dir: "like", match, celebrate: true, markLikedMe: true });
      maybeOpener(match.id, u.id);
    },

    startDemo: () => {
      const now = Date.now();
      const account = { ...DEMO_ACCOUNT, photos: [...DEMO_ACCOUNT.photos] };
      dispatch({ type: "START_ACCOUNT", account, my: demoMy(now), matches: buildSeedMatches(account, seedUsers(), now) });
      setTabState("discover");
      setStack([]);
      toast({ icon: Sparkles, title: "You're in the demo account", body: "Jamie has two weeks of history and a few matches." });
    },
    createAccount: (account) => {
      const now = Date.now();
      dispatch({ type: "START_ACCOUNT", account, my: freshMy(now), matches: buildSeedMatches(account, seedUsers(), now) });
      setTabState("discover");
      setStack([]);
      toast({ icon: Sparkles, title: `Welcome to Swirl, ${account.name}`, body: "You start at 1,000. Every like moves you up." });
    },
    logout: () => { setStack([]); setTabState("discover"); setRecap(null); dispatch({ type: "LOGOUT" }); },
    login: () => { setTabState("discover"); setStack([]); dispatch({ type: "PATCH", patch: { stage: "app" } }); },
    deleteAccount: () => { setStack([]); setTabState("discover"); setRecap(null); dispatch({ type: "DELETE_ACCOUNT" }); },
  }), [toast, later]); // eslint-disable-line react-hooks/exhaustive-deps

  fns.current.block = (userId) => {
    const st = stateRef.current;
    const u = st.users[userId];
    const gone = st.matches.filter((m) => m.userIds.includes(userId)).map((m) => m.id);
    setStack((s) => s.filter((r) => !(r.name === "chat" && gone.includes(r.matchId))));
    dispatch({ type: "BLOCK", userId });
    toast({ icon: Ban, title: `Blocked ${u ? u.name : "them"}`, body: "Manage blocked people in Settings." });
  };

  /* ---------- effects: live simulation ---------- */

  // Other students swipe on you every few seconds.
  useEffect(() => {
    if (state.stage !== "app" || !state.account || state.paused || state.simSpeed === "off") return undefined;
    let t;
    const loop = () => {
      const delay = state.simSpeed === "fast" ? rand(1300, 2300) : rand(5500, 8500);
      t = setTimeout(() => { fns.current.receiveIncoming(); loop(); }, delay);
    };
    loop();
    return () => clearTimeout(t);
  }, [state.stage, !!state.account, state.paused, state.simSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Everyone else keeps swiping on each other, so the leaderboard moves.
  useEffect(() => {
    if (state.stage !== "app") return undefined;
    const t = setInterval(() => dispatch({ type: "WORLD_TICK", ...worldEvents(stateRef.current) }), 2600);
    return () => clearInterval(t);
  }, [state.stage]);

  // Rank-up toasts and peak rank tracking.
  const prevRank = useRef(null);
  useEffect(() => {
    const prev = prevRank.current;
    prevRank.current = myRank;
    if (state.stage !== "app" || !myRank) return;
    if (!state.my.peakRank || myRank < state.my.peakRank) dispatch({ type: "PEAK", rank: myRank, at: Date.now() });
    if (prev && myRank < prev && state.notifications.rank && Date.now() - lastRankToast.current > 6000) {
      lastRankToast.current = Date.now();
      toast({ icon: Flame, title: `You climbed to #${myRank} 🔥`, body: `${fmt(state.my.score)} points on the CU Boulder leaderboard` });
    }
  }, [myRank, state.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tier-up toasts.
  const prevTier = useRef(null);
  useEffect(() => {
    if (!state.account) { prevTier.current = null; return; }
    const t = tierFor(state.my.score).id;
    const p = prevTier.current;
    prevTier.current = t;
    if (p && TIER_INDEX[t] > TIER_INDEX[p]) toast({ icon: Crown, title: `You reached ${TIERS[TIER_INDEX[t]].name}`, body: "New tier badge unlocked." });
  }, [state.my.score, state.account]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swirl Night start/end notifications.
  const snLive = useRef(null);
  useEffect(() => {
    if (state.stage !== "app") return undefined;
    const check = () => {
      const st = stateRef.current;
      const live = swirlNightStatus(Date.now(), st.swirlOverride, st.swirlOverrideAt).live;
      const prev = snLive.current;
      snLive.current = live;
      if (prev === null || prev === live) return;
      if (live && st.notifications.swirlNight) {
        toast({ icon: Moon, title: "Swirl Night is live", body: "A new batch of students just dropped. Two hours only.", action: { label: "Swipe", onClick: () => { setTabState("discover"); setStack([]); dispatch({ type: "PATCH", patch: { discoverMode: "solo" } }); } } });
      } else if (!live) {
        toast({ icon: Moon, title: "Swirl Night is over", body: "See you next Thursday at 9 PM." });
      }
    };
    check();
    const t = setInterval(check, 3000);
    return () => clearInterval(t);
  }, [state.stage, state.swirlOverride, state.swirlOverrideAt]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- layout ---------- */

  const unread = state.matches.reduce((n, m) => n + (m.unread || 0), 0);
  const celebrateMatch = state.celebrate ? state.matches.find((m) => m.id === state.celebrate) : null;
  const reportPerson = reportTarget ? state.users[reportTarget.id] : null;

  const renderRoute = (r) => {
    if (!state.account) return null;
    if (r.name === "chat") return <ChatScreen key={r.matchId} state={state} api={api} matchId={r.matchId} initialDraft={r.draft} />;
    if (r.name === "settings") return <SettingsScreen state={state} api={api} />;
    if (r.name === "edit") return <EditProfile state={state} api={api} />;
    if (r.name === "safety") return <SafetyCenter state={state} api={api} matchId={r.matchId} />;
    if (r.name === "blocked") return <BlockedScreen state={state} api={api} />;
    if (r.name === "group") return <GroupManager state={state} api={api} />;
    return null;
  };

  const frame = vp.w >= 520 && vp.h >= 560;
  const scale = frame ? Math.min(1, (vp.h - 48) / PHONE_H) : 1;
  const side = frame && vp.w >= 1100;

  const screen = (
    <div className="sw-app relative w-full h-full flex flex-col overflow-hidden" style={frame ? { borderRadius: 52 } : undefined}>
      {frame && <StatusBar />}
      <div ref={setLayerEl} className="relative flex-1 min-h-0 overflow-hidden">
        <LayerContext.Provider value={layerEl}>
          {state.stage === "splash" && (
            <Splash notice={state.notice} returning={state.account}
              onStart={() => dispatch({ type: "PATCH", patch: { stage: state.ageLocked ? "blocked" : "onboarding", notice: null } })}
              onDemo={api.startDemo} onReturn={api.login} />
          )}
          {state.stage === "onboarding" && (
            <Onboarding offline={state.offline} onCancel={() => dispatch({ type: "PATCH", patch: { stage: "splash" } })}
              onComplete={api.createAccount} onAgeBlocked={() => dispatch({ type: "PATCH", patch: { stage: "blocked", ageLocked: true } })} />
          )}
          {state.stage === "blocked" && <AgeBlocked onBack={() => dispatch({ type: "PATCH", patch: { stage: "splash" } })} />}
          {state.stage === "app" && state.account && (
            <>
              <div className="absolute left-0 right-0 top-0" style={{ bottom: TAB_H }}>
                {tab === "discover" && <Discover state={state} api={api} myRank={myRank} overlayOpen={!!celebrateMatch || !!recap || !!reportTarget || !!confirm || stack.length > 0} />}
                {tab === "leaderboard" && <Leaderboard state={state} api={api} />}
                {tab === "matches" && <MatchesScreen state={state} api={api} />}
                {tab === "profile" && <MyProfile state={state} api={api} board={board} />}
              </div>
              <TabBar tab={tab} unread={unread} onChange={(t) => { setTabState(t); setStack([]); }} />
              {stack.map((r, i) => (
                <div key={`${r.name}-${r.matchId || ""}-${i}`} className="absolute inset-0 z-20 sw-app sw-anim-slide">{renderRoute(r)}</div>
              ))}
            </>
          )}
          {celebrateMatch && (
            <MatchMoment match={celebrateMatch} state={state}
              onClose={() => dispatch({ type: "PATCH", patch: { celebrate: null } })}
              onMessage={(spot) => fns.current.openChat(celebrateMatch.id, spot ? `Want to check out ${spot.name} this week?` : "")} />
          )}
          {recap && (
            <SeasonRecap data={recap} onClose={() => setRecap(null)}
              onShared={(r) => toast(r === "shared" ? { icon: Share2, title: "Recap shared" } : { icon: Copy, title: "Recap copied", body: "Paste it anywhere." })} />
          )}
          {reportPerson && (
            <ReportSheet key={reportPerson.id} target={reportPerson} onClose={() => setReportTarget(null)}
              onSubmit={(r) => dispatch({ type: "REPORT", report: { ...r, targetId: reportPerson.id, ts: Date.now() } })}
              onDone={(alsoBlock) => {
                const t = reportTarget;
                setReportTarget(null);
                if (alsoBlock) fns.current.block(t.id);
                else toast({ icon: ShieldCheck, title: "Report sent", body: "Our safety team reviews reports within 24 hours." });
                if (t.after) t.after();
              }} />
          )}
          {confirm && (
            <Dialog open title={confirm.title} body={confirm.body} confirmLabel={confirm.confirmLabel} tone={confirm.tone || "danger"}
              onCancel={() => setConfirm(null)} onConfirm={confirm.onConfirm} />
          )}
          {!celebrateMatch && !recap && <ToastStack toasts={toasts} onDismiss={dismissToast} top={8} />}
        </LayerContext.Provider>
      </div>
      {frame && <div className="absolute left-1/2 bottom-2 -translate-x-1/2 h-1.5 w-32 rounded-full pointer-events-none z-50" style={{ background: "var(--text)", opacity: 0.35 }} aria-hidden="true" />}
    </div>
  );

  return (
    <FrameScale.Provider value={scale}>
      <div className="sw-root sw-page w-full flex items-center justify-center" data-theme={state.theme}
        style={{ minHeight: vp.h, height: frame ? undefined : vp.h, gap: 40, padding: frame ? 24 : 0, background: frame ? undefined : "var(--bg)" }}>
        <style>{GLOBAL_CSS}</style>
        <GradientDefs />
        {frame ? (
          <div className="relative shrink-0" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
            <div className="absolute left-0 top-0" style={{
              width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: "top left", borderRadius: 52,
              boxShadow: "0 0 0 10px #050308, 0 0 0 11px rgba(255,255,255,.14), 0 50px 120px -30px rgba(40,10,90,.65)",
            }}>
              {screen}
            </div>
          </div>
        ) : (
          <div className="w-full h-full">{screen}</div>
        )}
        {side && <SidePanel state={state} api={api} />}
      </div>
    </FrameScale.Provider>
  );
}
