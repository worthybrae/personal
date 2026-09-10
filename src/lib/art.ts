export interface ArtPiece {
  slug: string;
  name: string;
  description: string;
  summary: string;
  videoUrl?: string;
  imageUrl?: string;
  githubUrl?: string;
  tech: string[];
}

export const ART_PIECES: ArtPiece[] = [
  {
    slug: 'ai-architecture',
    name: 'AI ARCHITECTURE',
    description: 'STYLEGAN-GENERATED ARCHITECTURAL SPACES',
    summary: 'A StyleGAN-based exploration of architectural design using machine learning to generate and manipulate architectural spaces. The model was trained on 447 curated architectural images collected via an automated Selenium scraping system, all standardized to 512x512 resolution. Training used StyleGAN2-ADA for approximately 24 hours with data augmentation to compensate for the small dataset size. The video above demonstrates the "flesh digression" technique — a novel latent space interpolation method that follows curved paths through the model\'s learned representation, creating organic transformations between architectural forms rather than simple linear blends. The generated spaces exist between human design and machine learning, challenging traditional notions of architectural authorship.',
    videoUrl: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/flesh_digression.mp4',
    githubUrl: 'https://github.com/worthybrae/AI-Architecture',
    tech: ['StyleGAN2', 'PyTorch', 'Python', 'Selenium'],
  },
  {
    slug: 'livestream-art',
    name: 'LIVESTREAM ART',
    description: 'COMPUTER VISION VIDEO TRANSFORMATIONS',
    summary: 'Abbey Road becomes a living drawing: fine white and gray contours on charcoal, with precise outlines flowing through a gently distorted street. A native Rust renderer transforms the live camera feed and sends the finished artwork to this page. The renderer runs on demand, preserving the source cadence while keeping the stream small. The studio uses the same renderer to explore line weight, contrast, and the movement of the drawing.',
    videoUrl: '/media/abbey-road-ink.mp4',
    githubUrl: 'https://github.com/worthybrae/livestream-morphing',
    tech: ['Rust', 'FFmpeg', 'HLS', 'React'],
  },
];

export function getArtPiece(slug: string): ArtPiece | undefined {
  return ART_PIECES.find((a) => a.slug === slug);
}
