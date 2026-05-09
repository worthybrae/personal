import TerrainLayout from '@/components/Layout/TerrainLayout';

const ART_PIECES = [
  {
    name: 'AI Architecture',
    description: 'StyleGAN-generated architectural spaces',
    videoUrl: 'https://portfolio-worthy.s3.amazonaws.com/ai-architecture-demo.mp4',
  },
  {
    name: 'Livestream Art',
    description: 'Computer vision Abbey Road transformation',
    videoUrl: 'https://portfolio-worthy.s3.amazonaws.com/livestream-art-demo.mp4',
  },
];

export default function ArtListPage() {
  return (
    <TerrainLayout title="ART">
      <div className="space-y-6">
        {ART_PIECES.map((piece) => (
          <div
            key={piece.name}
            className="bg-[#08080c]/85 backdrop-blur-xl border border-cyber-magenta/15 rounded-lg overflow-hidden"
          >
            <video
              src={piece.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full aspect-video object-cover"
            />
            <div className="p-6">
              <h2 className="font-mono text-lg font-bold text-white">{piece.name}</h2>
              <p className="font-mono text-sm text-white/50 mt-1">{piece.description}</p>
            </div>
          </div>
        ))}
      </div>
    </TerrainLayout>
  );
}
