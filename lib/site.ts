/** Single source of truth for SEO / social metadata. Edit here, not in the pages. */

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE = {
  name: 'Sajad City',
  author: 'Sajad Mashood A',
  jobTitle: 'Software Engineer',
  /** Home of the game (the "/" route redirects here). */
  homePath: '/general',
  /**
   * Your real domain, e.g. https://sajad.dev. Set NEXT_PUBLIC_SITE_URL in your host's env settings.
   * (Falls back to the Vercel production URL, then localhost.) Needed so og:image gets an absolute URL.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000'),
  title: 'Sajad City | Sajad Mashood A — Software Engineer',
  description:
    "Walk through Sajad Mashood A's pixel-art city to explore his projects, experience and skills. A software engineer building with Next.js, React and NestJS.",
  keywords: [
    'Sajad Mashood',
    'Sajad Mashood A',
    'Sajad City',
    'software engineer',
    'full-stack developer',
    'portfolio',
    'interactive portfolio',
    'Next.js',
    'React',
    'TypeScript',
    'NestJS',
    'MongoDB',
    'Phaser',
    'Kerala',
  ],
  github: 'https://github.com/sj-ms-sudo',
  linkedin: 'https://linkedin.com/in/sajadmashood',
  themeColor: '#ff8fe8',
} as const;
