import { Link } from 'react-router-dom';
import ContactForm from '@/components/global/ContactForm';

export default function Hero() {
  return (
    <section className="relative min-h-[70vh] flex items-end overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover hidden md:block"
      >
        <source
          src="https://portfolio-worthy.s3.amazonaws.com/livestream-demo.mp4"
          type="video/mp4"
        />
      </video>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover md:hidden"
      >
        <source
          src="https://portfolio-worthy.s3.amazonaws.com/ai-architecture-demo.mp4"
          type="video/mp4"
        />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#08080c]/30 via-transparent to-[#08080c]" />

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-mono text-sm font-bold text-white tracking-widest">WR</Link>
        <div className="hidden md:flex items-center gap-6 font-mono text-xs">
          <a href="#websites" className="text-cyber-cyan hover:opacity-80 transition-opacity">websites</a>
          <a href="#art" className="text-cyber-magenta hover:opacity-80 transition-opacity">art</a>
          <a href="#blog" className="text-cyber-amber hover:opacity-80 transition-opacity">blog</a>
          <ContactForm compact />
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 w-full flex items-end justify-between px-6 pb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-none">
            WORTHY RAE
          </h1>
          <p className="font-mono text-xs text-white/40 tracking-[0.25em] mt-2">
            ENGINEER · ARTIST · BUILDER
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://portfolio-worthy.s3.amazonaws.com/Worthy_Rae_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white/10 border border-white/20 rounded text-white font-mono text-xs hover:bg-white/20 transition-colors"
          >
            RESUME ↓
          </a>
        </div>
      </div>
    </section>
  );
}
