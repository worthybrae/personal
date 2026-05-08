import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';
import ArtCard from './ArtCard';

const ART_META = [
  {
    slug: 'ai-architecture',
    title: 'AI Architecture',
    description: 'StyleGAN-generated architectural spaces',
    imageUrl: 'https://portfolio-worthy.s3.amazonaws.com/ai-architecture-hero.png',
    link: '/art/ai-architecture',
  },
  {
    slug: 'livestream-art',
    title: 'Livestream Art',
    description: 'Computer vision Abbey Road transformation',
    imageUrl: 'https://portfolio-worthy.s3.amazonaws.com/livestream-art-hero.png',
    link: '/art/livestream-art',
  },
];

export default function ArtPanel() {
  const { data } = useFetch(api.getPageViews);

  return (
    <section id="art" className="px-6 py-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="font-mono text-[10px] text-cyber-magenta tracking-[0.2em]">■ ART</span>
        <span className="font-mono text-[10px] text-cyber-dim">2 pieces</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ART_META.map((art) => {
          const pageData = data?.pages.find((p) => p.path.includes(art.slug));
          return (
            <ArtCard
              key={art.slug}
              title={art.title}
              description={art.description}
              imageUrl={art.imageUrl}
              views={pageData?.views_30d ?? 0}
              link={art.link}
            />
          );
        })}
      </div>
    </section>
  );
}
