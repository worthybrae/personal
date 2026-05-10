export interface ProjectMeta {
  slug: string;
  name: string;
  url: string;
  videoUrl?: string;
}

export const PROJECTS: ProjectMeta[] = [
  {
    slug: 'coderview',
    name: 'CODERVIEW',
    url: 'https://www.coderview-ai.com/',
    videoUrl: 'https://www.youtube.com/embed/9LjGWi0-JgE?autoplay=1&mute=1&loop=1&playlist=9LjGWi0-JgE&controls=0&showinfo=0&rel=0',
  },
  {
    slug: 'streamclout',
    name: 'STREAMCLOUT',
    url: 'https://streamclout.io',
    // videoUrl: 'https://your-bucket.s3.amazonaws.com/streamclout-promo.mp4',
  },
];

export function getProject(slug: string): ProjectMeta | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
