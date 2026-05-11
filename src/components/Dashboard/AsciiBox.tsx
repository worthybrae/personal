import { type ReactNode } from 'react';

interface AsciiBoxProps {
  children: ReactNode;
  accentColor?: string;
  className?: string;
}

export default function AsciiBox({ children, accentColor = '#444', className = '' }: AsciiBoxProps) {
  return (
    <div
      className={`font-mono text-xs relative group ${className}`}
      style={{ color: accentColor }}
    >
      <div className="transition-colors group-hover:text-current" style={{ color: '#444' }}>
        {/* Top border */}
        <div className="select-none overflow-hidden whitespace-nowrap group-hover:text-[var(--accent)]" style={{ '--accent': accentColor } as React.CSSProperties}>
          ┌{'─'.repeat(60)}┐
        </div>

        {/* Content area */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 select-none">
          </div>
          <div className="px-4 py-3 text-white">
            {children}
          </div>
        </div>

        {/* Bottom border */}
        <div className="select-none overflow-hidden whitespace-nowrap">
          └{'─'.repeat(60)}┘
        </div>
      </div>
    </div>
  );
}
