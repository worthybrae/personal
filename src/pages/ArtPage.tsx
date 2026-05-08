import { useParams, Link } from 'react-router-dom';
import AIArchitecture from '@/components/projects/AIArchitecture';
import LivestreamArt from '@/components/projects/LivestreamArt';

const ART_COMPONENTS: Record<string, React.ComponentType> = {
  'ai-architecture': AIArchitecture,
  'livestream-art': LivestreamArt,
};

export default function ArtPage() {
  const { slug } = useParams<{ slug: string }>();
  const Component = slug ? ART_COMPONENTS[slug] : null;

  if (!Component) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Not Found</h1>
          <Link to="/" className="text-cyber-cyan font-mono text-sm mt-4 inline-block">← back to dashboard</Link>
        </div>
      </div>
    );
  }

  return <Component />;
}
