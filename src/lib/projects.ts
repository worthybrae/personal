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
    // videoUrl: 'https://your-bucket.s3.amazonaws.com/coderview-promo.mp4',
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
