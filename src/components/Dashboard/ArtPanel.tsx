import AsciiBox from './AsciiBox';

const ART_PIECES = [
  {
    name: 'AI Architecture',
    description: 'StyleGAN-generated architectural spaces — neural networks dreaming of buildings',
    videoUrl: 'https://portfolio-worthy.s3.amazonaws.com/ai-architecture-demo.mp4',
  },
  {
    name: 'Livestream Art',
    description: 'Computer vision Abbey Road transformation — real-time style transfer on live camera feeds',
    videoUrl: 'https://portfolio-worthy.s3.amazonaws.com/livestream-art-demo.mp4',
  },
];

export default function ArtPanel() {
  return (
    <div className="space-y-6 py-4">
      {ART_PIECES.map((piece) => (
        <AsciiBox key={piece.name} accentColor="#d946ef">
          <div>
            <div className="relative rounded-sm overflow-hidden mb-3">
              <video
                src={piece.videoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full aspect-video object-cover"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
                }}
              />
            </div>
            <div className="text-white font-bold text-sm">{piece.name}</div>
            <div className="text-white/40 text-xs mt-1 leading-relaxed">{piece.description}</div>
          </div>
        </AsciiBox>
      ))}
    </div>
  );
}
