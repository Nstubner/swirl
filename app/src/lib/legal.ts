/**
 * Privacy Policy, Terms of Use and Community Guidelines shown in the app.
 * Keep these in sync with the public web version you link from the App Store listing.
 * Not legal advice: have someone qualified review before launch.
 */

/** Optional. Shown on the Help screen and legal pages when set. */
export const SUPPORT_EMAIL = '';

export const LEGAL_UPDATED = 'October 11, 2026';

export type LegalDoc = { title: string; intro: string; sections: { h: string; p: string[] }[] };
export type LegalId = 'privacy' | 'terms' | 'guidelines';

const contact = SUPPORT_EMAIL
  ? `Questions? Use Profile → Help & support in the app, or email ${SUPPORT_EMAIL}.`
  : 'Questions? Use Profile → Help & support in the app.';

export const LEGAL: Record<LegalId, LegalDoc> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'Swirl is a dating app for college students. This explains what we collect, why, who can see it, and how to delete it. Short version: we use your info to run the app, we never sell it, and we never show ads.',
    sections: [
      {
        h: 'What we collect',
        p: [
          'Your school email, used to sign you in and confirm you are a student.',
          'What you put on your profile: first name, birthday (only your age is shown), gender, who you want to see, pronouns, major, class year, photos with optional captions and locations you type, bio, prompt answers, interests, classes, dorm, Greek chapter, favorite spots and your favorite order.',
          'What you do in the app: likes, passes, Super Likes, comments on likes, matches, messages, reports, blocks, your score and tier, invites, and the days you open the app.',
          'An optional verification selfie, if you choose to get verified.',
          'A push notification token, if you turn notifications on.',
          'Crash and error details (the error message, screen name, phone type and app version) so we can fix bugs.',
          'We do not collect your phone’s GPS location, contacts, or payment information.',
        ],
      },
      {
        h: 'Who can see what',
        p: [
          'Other signed-in students can see your profile (name, age, photos, prompts and the other profile fields you fill in) in Discover, on your profile page, and in matches.',
          'The leaderboard shows your name, photo, tier and rank based on the visibility setting you choose. Nobody ever sees how many passes you get.',
          'Messages are only visible to you and your match. Our small admin team can review content that has been reported.',
          'Your birthday, email, verification selfie, reports and blocks are never shown to other users. Your verification selfie is only seen by our review team.',
        ],
      },
      {
        h: 'How we use it',
        p: [
          'To show you people, match you, run chats, calculate scores and leaderboards, send notifications you turned on, keep the community safe (spam limits, word filters, reports, bans), and understand how the app is used so we can improve it.',
        ],
      },
      {
        h: 'Who we share it with',
        p: [
          'Service providers that run the app for us: Supabase (database, sign-in and photo storage), Expo (push notifications) and our email provider (sign-in codes). They only use it to provide those services.',
          'If the law requires it, or to protect someone’s safety.',
          'We do not sell your information and we do not share it with advertisers.',
        ],
      },
      {
        h: 'Keeping and deleting your data',
        p: [
          'You can delete your account any time in Profile → Delete account. That removes your profile, photos, likes, matches and messages right away. Backups held by our providers roll off within about 30 days.',
          'Pause your account in Profile to hide from Discover and the leaderboard without deleting anything.',
          'Crash logs and support messages you sent stay, with your name removed, so we can fix bugs.',
        ],
      },
      {
        h: 'Age',
        p: ['Swirl is only for people 18 and older. If we learn someone under 18 has an account, we delete it.'],
      },
      {
        h: 'Changes and contact',
        p: ['If we change this policy in a meaningful way, we will tell you in the app. ' + contact],
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: 'By creating an account or using Swirl you agree to these terms. Please read them. If you do not agree, do not use Swirl.',
    sections: [
      {
        h: 'Who can use Swirl',
        p: [
          'You must be at least 18, a current college student with a working .edu email, and allowed to use the app where you live.',
          'One account per person. Your account is yours alone; keep your email secure.',
        ],
      },
      {
        h: 'No tolerance for abuse',
        p: [
          'Swirl has zero tolerance for objectionable content or abusive users. You agree to follow the Community Guidelines. We review reports within 24 hours and may remove content and ban accounts that break the rules, without warning.',
          'You can report or block anyone from their profile or your chat with them.',
        ],
      },
      {
        h: 'Your content',
        p: [
          'You own the photos and text you post. You give Swirl permission to store and display them inside the app so the service works. You confirm you have the right to post them and that photos of you are actually you.',
          'We may remove anything that breaks these terms or the guidelines.',
        ],
      },
      {
        h: 'Scores, leaderboards and rewards',
        p: [
          'Scores, tiers, badges, Super Likes, Boosts and leaderboards are part of a game. They have no cash value, cannot be sold or transferred, and may be adjusted or reset (for example at the start of a season or if we detect cheating).',
          'Physical rewards (like a hoodie for inviting friends) are limited, subject to availability, and may change or end.',
          'Using fake accounts, bots, or coordinated liking to change scores or team boards is cheating and can get you banned.',
        ],
      },
      {
        h: 'Meeting people',
        p: [
          'Swirl does not run background checks and is not responsible for how users act on or off the app. Use good judgment: meet in public, tell a friend where you are going, and leave if you feel unsafe.',
        ],
      },
      {
        h: 'Ending your account',
        p: ['You can delete your account any time. We may suspend or end accounts that break these terms or put others at risk.'],
      },
      {
        h: 'Disclaimers',
        p: [
          'Swirl is provided “as is,” without warranties of any kind. We do not promise the app will always be available, error-free, or that you will find a match.',
          'To the fullest extent the law allows, Swirl and its team are not liable for indirect or consequential damages, or for anything other users do. Our total liability is limited to $100.',
        ],
      },
      {
        h: 'Changes and law',
        p: [
          'We may update these terms. If changes are significant we will tell you in the app; continuing to use Swirl means you accept them.',
          'These terms are governed by the laws of the State of Colorado, USA. ' + contact,
        ],
      },
    ],
  },
  guidelines: {
    title: 'Community Guidelines',
    intro: 'Swirl only works if people feel safe and respected. Breaking these rules can get your content removed or your account banned.',
    sections: [
      {
        h: 'Be real',
        p: ['Use your real first name and recent photos of you. No impersonation, catfishing, or fake accounts.'],
      },
      {
        h: 'Be kind',
        p: ['No harassment, bullying, threats, hate speech, or unwanted sexual messages. If someone isn’t interested, move on.'],
      },
      {
        h: 'Keep it appropriate',
        p: ['No nudity or sexual content, no violence or weapons, no drugs, and nothing involving anyone under 18.'],
      },
      {
        h: 'No spam or selling',
        p: ['No ads, promotions, links to other platforms for money, or asking people for money.'],
      },
      {
        h: 'Play fair',
        p: ['No bots, multiple accounts, or swapping likes to game the leaderboard or team boards.'],
      },
      {
        h: 'Stay safe',
        p: [
          'Meet in public the first few times, tell a friend your plans, and get your own ride. Report anything that feels wrong.',
          'In an emergency call 911. CU Boulder Police (non-emergency, 24/7): 303-492-6666. CU Boulder Office of Victim Assistance: 303-492-8855.',
        ],
      },
    ],
  },
};

export const FAQ: { q: string; a: string }[] = [
  { q: 'I didn’t get my sign-in code', a: 'Check your spam or junk folder and wait a minute. Codes expire after an hour, so ask for a new one if it’s old.' },
  { q: 'How does my score work?', a: 'Tap your score or any tier badge in the app for a simple explanation. Likes move you up; passes are tiny and never shown to anyone.' },
  { q: 'Can I change my birthday?', a: 'Once, then once every 6 months. Go to Profile → Edit profile.' },
  { q: 'Can I change my dorm or chapter?', a: 'Once per season, since they count toward team leaderboards.' },
  { q: 'How do I report or block someone?', a: 'Open their profile or your chat with them and tap Report or Block. They won’t be told.' },
  { q: 'How do I hide or delete my account?', a: 'Profile → Pause hides you without deleting anything. Profile → Delete account removes everything.' },
];
