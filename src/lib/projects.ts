export interface ProjectMeta {
  slug: string;
  name: string;
  description: string;
  summary: string;
  url: string;
  videoUrl?: string;
  /** First frame of the video, shown while it loads. */
  posterUrl?: string;
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
    posterUrl: '/media/code/coderview.jpg',
    tech: ['React', 'FastAPI', 'OpenAI', 'Python', 'TypeScript'],
  },
  {
    slug: 'streamclout',
    name: 'STREAMCLOUT',
    description: 'STREAMING ANALYTICS DASHBOARD',
    summary: 'StreamClout tracks the play count of every song on Spotify, every day, numbers Spotify\'s public API doesn\'t offer. Each night it refreshes 4.7M artists, 24.3M albums and 81.2M songs, plus 2.3M playlists holding 149M song slots, and the daily history runs back to January 2026. Fitting that into one night has taken a year of rewrites, from a Python crawler to a Rust ingestion engine and a columnar build pipeline. The old nightly build re-read a month of raw play counts, 2.7 billion rows, in 128 minutes on a 16-core cloud machine; today a day of history is stored in 56 MB instead of 2.7 GB. In November 2026 the API server was switched off entirely and the site moved to the edge, with warm lookups at a 9 ms p95. One query fix alone took an artist export from 44 minutes to two.',
    url: 'https://streamclout.io',
    videoUrl: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/StreamCloutAd.mp4',
    posterUrl: '/media/code/streamclout.jpg',
    tech: ['Rust', 'Python', 'DuckDB', 'Cloudflare', 'React', 'TypeScript'],
  },
];

export function getProject(slug: string): ProjectMeta | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
