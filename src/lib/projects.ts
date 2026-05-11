export interface ProjectMeta {
  slug: string;
  name: string;
  description: string;
  summary: string;
  url: string;
  videoUrl?: string;
  imageUrl?: string;
  tech: string[];
}

export const PROJECTS: ProjectMeta[] = [
  {
    slug: 'coderview',
    name: 'CODERVIEW',
    description: 'AI-POWERED HIRING TOOLS',
    summary: 'An AI-powered platform for technical career development built with React, FastAPI, and OpenAI. Coderview analyzes resumes across multiple dimensions including work experience, education, projects, and certifications — scoring each section for impact, relevance, and presentation quality. The GitHub analysis module extracts and evaluates code from public repositories, assessing architecture, security practices, documentation, and testing coverage. A cover letter generator matches relevant skills from your resume against specific job descriptions, structuring them into a tailored narrative with customizable tone. All documents are encrypted in transit and at rest, with temporary storage that\'s purged after analysis.',
    url: 'https://www.coderview-ai.com/',
    videoUrl: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/coderview-demo.mp4',
    tech: ['React', 'FastAPI', 'OpenAI', 'Python', 'TypeScript'],
  },
  {
    slug: 'streamclout',
    name: 'STREAMCLOUT',
    description: 'STREAMING ANALYTICS DASHBOARD',
    summary: 'A real-time analytics platform that brings transparency to music streaming metrics. StreamClout reverse-engineers Spotify\'s internal GraphQL endpoints to access play count data unavailable through their public API, using Playwright for headless browser automation to capture authentication tokens. A distributed Celery task queue continuously processes thousands of albums in three stages — batch retrieval, track data fetching with exponential backoff, and trend analysis. The frontend dynamically extracts color schemes from album cover art to create unique visual identities for each artist page, and a "Stream Velocity" metric identifies tracks experiencing unusual growth patterns that might indicate viral potential. The platform also exposes a public API with rate limiting and key management for third-party integrations.',
    url: 'https://streamclout.io',
    videoUrl: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/StreamCloutAd.mp4',
    tech: ['React', 'FastAPI', 'Celery', 'Playwright', 'PostgreSQL', 'Python', 'Rust'],
  },
];

export function getProject(slug: string): ProjectMeta | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
