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
    summary: 'At Abbey Road, cars and pedestrians pass through a drawing that never quite settles. The camera image becomes fine white contours on charcoal, and a slow distortion bends the street as it moves. The crossing stays recognizable while its outlines take on a movement of their own.',
    videoUrl: '/media/abbey-road-ink.mp4',
    githubUrl: 'https://github.com/worthybrae/livestream-morphing',
    tech: ['Rust', 'FFmpeg', 'HLS', 'React'],
  },
];

export function getArtPiece(slug: string): ArtPiece | undefined {
  return ART_PIECES.find((a) => a.slug === slug);
}
