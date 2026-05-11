export interface ArtPiece {
  slug: string;
  name: string;
  description: string;
  summary: string;
  videoUrl?: string;
  imageUrl?: string;
  githubUrl?: string;
}

export const ART_PIECES: ArtPiece[] = [
  {
    slug: 'ai-architecture',
    name: 'AI ARCHITECTURE',
    description: 'STYLEGAN-GENERATED ARCHITECTURAL SPACES',
    summary: 'A StyleGAN-based exploration of architectural design using machine learning to generate and manipulate architectural spaces. The model was trained on 447 curated architectural images collected via an automated Selenium scraping system, all standardized to 512x512 resolution. Training used StyleGAN2-ADA for approximately 24 hours with data augmentation to compensate for the small dataset size. The video above demonstrates the "flesh digression" technique — a novel latent space interpolation method that follows curved paths through the model\'s learned representation, creating organic transformations between architectural forms rather than simple linear blends. The generated spaces exist between human design and machine learning, challenging traditional notions of architectural authorship.',
    videoUrl: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/flesh_digression.mp4',
    githubUrl: 'https://github.com/worthybrae/AI-Architecture',
  },
  {
    slug: 'livestream-art',
    name: 'LIVESTREAM ART',
    description: 'COMPUTER VISION VIDEO TRANSFORMATIONS',
    summary: 'Real-time artistic transformation of the iconic Abbey Road crossing livestream into a continuous, ever-changing digital canvas. The system captures the HLS feed at 30 frames per second, applies Gaussian blur for noise reduction, then runs Canny edge detection with adaptive thresholds that adjust to the scene\'s overall brightness and time of day. Morphological operations smooth the detected edges into cleaner lines, and a dynamic overlay adds contextual time and location data. A distributed Celery task queue manages the computational workload across multiple worker nodes, maintaining an average processing latency of just 200ms per frame on Full HD 1920x1080 video — ensuring the artistic visualization stays connected to the live events at the crossing.',
    videoUrl: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/abbey_road_best.mp4',
    githubUrl: 'https://github.com/worthybrae/livestream-morphing',
  },
];

export function getArtPiece(slug: string): ArtPiece | undefined {
  return ART_PIECES.find((a) => a.slug === slug);
}
