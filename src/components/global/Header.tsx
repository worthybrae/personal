import { Link } from 'react-router-dom';
import ContactForm from './ContactForm';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08080c]/80 backdrop-blur-md border-b border-white/[0.05]">
      <div className="flex items-center justify-between px-6 py-3">
        <Link to="/" className="font-mono text-sm font-bold text-white tracking-widest hover:text-cyber-cyan transition-colors">
          WR
        </Link>
        <div className="flex items-center gap-6 font-mono text-xs">
          <Link to="/#websites" className="text-cyber-cyan hover:opacity-80 transition-opacity hidden md:inline">
            websites
          </Link>
          <Link to="/#art" className="text-cyber-magenta hover:opacity-80 transition-opacity hidden md:inline">
            art
          </Link>
          <Link to="/#blog" className="text-cyber-amber hover:opacity-80 transition-opacity hidden md:inline">
            blog
          </Link>
          <ContactForm compact />
        </div>
      </div>
    </header>
  );
}
