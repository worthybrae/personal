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
    tech: ['StyleGAN2-ADA', 'PyTorch', 'Python', 'Selenium'],
  },
  {
    slug: 'livestream-art',
    name: 'LIVESTREAM ART',
    description: 'A LIVE PAINTING OF ABBEY ROAD',
    summary: 'An ongoing digital painting of Abbey Road, made from a live camera feed. Brush marks follow movement through the street and are revised as people, cars, and light change.',
    videoUrl: '/media/livestream/stream.mp4',
    githubUrl: 'https://github.com/worthybrae/livestream-morphing',
    tech: ['Rust', 'Python', 'OpenCV', 'FFmpeg', 'HLS'],
  },
  {
    slug: 'koi-pond',
    name: 'KOI POND',
    description: 'A LIVING POND BEHIND THE CHAT',
    summary: 'A pixel-art koi pond made as a backdrop for Claude Code, drawn live here. Fish swim slow loops through water where pools of light and shade sway, under lily pads that drift off one edge and back on at the other, bumping off each other as they go. The pond follows New York: it rains and snows when the city does, darkens at sunset, and glowing fish come out at night. Every motion runs on the clock, so the pond is the same wherever you look at it.',
    tech: ['TypeScript', 'SVG', 'CSS Animation', 'Open-Meteo'],
  },
];

export function getArtPiece(slug: string): ArtPiece | undefined {
  return ART_PIECES.find((a) => a.slug === slug);
}
