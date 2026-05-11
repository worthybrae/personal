import React, { useState, useEffect } from 'react';

export interface FeedItem {
  text: string;
  url: string;
  description?: string;
  mau?: string;
  category?: string;
  videoUrl?: string;
}

interface FeedOverlayProps {
  items: FeedItem[];
  onItemClick: (url: string) => void;
  meltCompleteRef: React.RefObject<boolean>;
  closing?: boolean;
}

export default function FeedOverlay({ items, onItemClick, meltCompleteRef, closing }: FeedOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (closing) {
      setVisible(false);
      return;
    }
    let raf: number;
    let delayTimer: number;
    const check = () => {
      if (meltCompleteRef.current) {
        // Pause on black before fading content in
        delayTimer = window.setTimeout(() => setVisible(true), 300);
      } else {
        raf = requestAnimationFrame(check);
      }
    };
    raf = requestAnimationFrame(check);
    return () => { cancelAnimationFrame(raf); clearTimeout(delayTimer); };
  }, [meltCompleteRef, closing]);

  return (
    <div
      className={`fixed left-0 right-0 bottom-0 z-10 overflow-y-auto ease-in-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        top: '100px',
        paddingTop: '20px',
        paddingBottom: '80px',
        transitionProperty: 'opacity',
        transitionDuration: visible ? '1200ms' : '500ms',
      }}
    >
      <div className="max-w-2xl mx-auto px-6 space-y-12">
        {items.map((item, i) => (
          <button
            key={`${item.category}-${item.text}-${i}`}
            className="block w-full text-center group cursor-pointer"
            onClick={() => onItemClick(item.url)}
          >
            {item.category && (
              <div
                className="font-mono text-xs tracking-[0.3em] uppercase mb-2 opacity-40 group-hover:opacity-70 transition-opacity"
                style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
              >
                {item.category}
              </div>
            )}
            <div
              className="font-black text-4xl md:text-5xl uppercase tracking-tight text-white group-hover:text-white/70 transition-colors"
              style={{ fontFamily: "'Arial Black', 'Impact', 'Helvetica Neue', sans-serif" }}
            >
              {item.text}
            </div>
            {item.description && (
              <div
                className="font-mono text-xs md:text-sm uppercase tracking-wider mt-2 text-white/30 group-hover:text-white/50 transition-colors"
                style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
              >
                {item.description}
              </div>
            )}
            {item.mau && (
              <div
                className="font-mono text-xs uppercase tracking-widest mt-1 text-white/20 group-hover:text-white/40 transition-colors"
                style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
              >
                {item.mau}
              </div>
            )}
            {item.videoUrl && (
              <div className="mt-4">
                {item.videoUrl.includes('youtube.com') ? (
                  <iframe
                    className="w-full rounded-lg shadow-lg shadow-black/30"
                    style={{ aspectRatio: '16/9', border: 'none' }}
                    src={item.videoUrl}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <video
                    className="w-full rounded-lg shadow-lg shadow-black/30"
                    src={item.videoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
