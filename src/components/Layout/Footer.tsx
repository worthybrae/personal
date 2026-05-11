export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] px-6 py-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-5 font-mono text-xs text-cyber-dim">
        <a href="https://open.spotify.com/user/worthybrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          spotify
        </a>
        <a href="https://linkedin.com/in/worthyrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          linkedin
        </a>
        <a href="https://github.com/worthybrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          github
        </a>
        <a href="https://letterboxd.com/worthybrae" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">
          letterboxd
        </a>
      </div>
      <div className="font-mono text-[10px] text-cyber-dim/60">
        powered by GA4 · built with react + fastapi
      </div>
    </footer>
  );
}
