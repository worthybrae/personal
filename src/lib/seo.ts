import { PROJECTS } from './projects';
import { ART_PIECES } from './art';

export const SITE = {
  url: 'https://worthyrae.com',
  name: 'Worthy Rae',
  title: 'Worthy Rae — Software Engineer & Generative Artist',
  description:
    'Worthy Rae builds AI and data products like Coderview and StreamClout, makes generative art with StyleGAN and computer vision, and writes music. Portfolio, projects, and current listening.',
  image: '/logo.png',
  locale: 'en_US',
  author: 'Worthy Rae',
  sameAs: [
    'https://github.com/worthybrae',
    'https://linkedin.com/in/worthyrae',
    'https://open.spotify.com/user/worthybrae',
    'https://letterboxd.com/worthybrae',
  ],
};

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  /** Open Graph type: 'website' for index pages, 'article' for detail pages. */
  type: 'website' | 'article';
  image?: string;
  /** Excluded from the sitemap when false. */
  indexable?: boolean;
}

/**
 * The project and art copy is authored in ALL CAPS for the canvas renderer.
 * All-caps titles read as shouting in search results, so they get downcased —
 * except for these, whose casing is a name rather than an accident. Keyed by
 * the uppercase form.
 */
const CASING: Record<string, string> = {
  AI: 'AI',
  ML: 'ML',
  API: 'API',
  UI: 'UI',
  UX: 'UX',
  '3D': '3D',
  STYLEGAN: 'StyleGAN',
  STYLEGAN2: 'StyleGAN2',
  STREAMCLOUT: 'StreamClout',
  OPENCV: 'OpenCV',
  OPENAI: 'OpenAI',
  FFMPEG: 'FFmpeg',
  PYTORCH: 'PyTorch',
  POSTGRESQL: 'PostgreSQL',
  FASTAPI: 'FastAPI',
  TYPESCRIPT: 'TypeScript',
  GITHUB: 'GitHub',
};

function recase(token: string): string {
  const known = CASING[token.toUpperCase()];
  if (known) return known;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/** "AI-POWERED HIRING TOOLS" -> "AI-Powered Hiring Tools". */
export function humanize(text: string): string {
  return text
    .split(' ')
    .map((word) => word.split('-').map(recase).join('-'))
    .join(' ');
}

/** First `max` characters of a summary, cut on a word boundary. */
function clamp(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

function pageTitle(subject: string): string {
  return `${subject} — ${SITE.name}`;
}

export const STATIC_ROUTES: RouteMeta[] = [
  {
    path: '/',
    title: SITE.title,
    description: SITE.description,
    type: 'website',
  },
  {
    path: '/feed',
    title: pageTitle('Portfolio'),
    description:
      'Software projects and generative art by Worthy Rae — AI hiring tools, streaming analytics, StyleGAN architecture, and computer vision video work.',
    type: 'website',
  },
  {
    path: '/music',
    title: pageTitle('Music'),
    description:
      'Original music written and recorded by Worthy Rae, streamable in the browser.',
    type: 'website',
  },
];

/** Every statically known route, with its per-route metadata. */
export function allRoutes(): RouteMeta[] {
  return [
    ...STATIC_ROUTES,
    ...PROJECTS.map<RouteMeta>((p) => ({
      path: `/work/${p.slug}`,
      title: `${humanize(p.name)} — ${humanize(p.description)}`,
      description: clamp(p.summary),
      type: 'article',
      image: p.imageUrl,
    })),
    ...ART_PIECES.map<RouteMeta>((a) => ({
      path: `/art/${a.slug}`,
      title: `${humanize(a.name)} — ${humanize(a.description)}`,
      description: clamp(a.summary),
      type: 'article',
      image: a.imageUrl,
    })),
  ];
}

export function routeMeta(pathname: string): RouteMeta {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return (
    allRoutes().find((r) => r.path === normalized) ?? {
      ...STATIC_ROUTES[0],
      path: normalized,
    }
  );
}

/** schema.org Person for the site owner, emitted on every page. */
export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.name,
    url: SITE.url,
    image: `${SITE.url}${SITE.image}`,
    jobTitle: 'Software Engineer',
    sameAs: SITE.sameAs,
  };
}
