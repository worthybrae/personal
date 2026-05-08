import AsciiHero from '@/components/Dashboard/AsciiHero';
import StatsTicker from '@/components/Dashboard/StatsTicker';
import WebsitesPanel from '@/components/Dashboard/WebsitesPanel';
import ArtPanel from '@/components/Dashboard/ArtPanel';
import BlogPanel from '@/components/Dashboard/BlogPanel';
import Footer from '@/components/Layout/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#08080c]">
      <AsciiHero />
      <StatsTicker />
      <WebsitesPanel />
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <ArtPanel />
      <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <BlogPanel />
      <Footer />
    </div>
  );
}
