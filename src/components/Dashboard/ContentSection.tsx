import { useState, useEffect } from 'react';
import { useFetch } from '@/hooks/useAnalytics';
import { api } from '@/lib/api';

interface ContentSectionProps {
  activeLabel: string | null;
}

const WORK_SLUGS = ['coderview', 'streamclout'];

export default function ContentSection({ activeLabel }: ContentSectionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activeLabel) {
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [activeLabel]);

  if (!activeLabel) return null;

  return (
    <div
      className={`fixed z-20 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        top: '50px',
        width: 'min(672px, calc(100vw - 48px))',
        height: 'calc(100vh - 100px)',
      }}
    >
      {activeLabel === 'work' && <WorkContent />}
    </div>
  );
}

function WorkContent() {
  const { data: projects } = useFetch(() => api.getProjects());
  const projectMap = new Map(
    (projects?.projects ?? []).map((p) => [p.slug, p]),
  );

  // Compute Y positions matching the terrain animation layout
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cutH = vh - 100;
  const isPortrait = vh > vw;
  const maxCutW = Math.min(672, vw - 48);
  const titleH = isPortrait ? maxCutW * 0.18 : cutH * 0.09;
  const count = WORK_SLUGS.length;
  const totalH = count * titleH * 1.4;
  const startY = cutH / 2 - totalH / 2 + titleH * 0.7;

  return (
    <div className="relative h-full">
      {WORK_SLUGS.map((slug, i) => {
        const analytics = projectMap.get(slug);
        const centerY = startY + i * titleH * 1.4;
        const mauTop = centerY + titleH * 0.6;

        return (
          <div
            key={slug}
            className="absolute left-0 right-0 text-center"
            style={{ top: `${mauTop}px` }}
          >
            <div className="inline-flex items-baseline gap-2 font-mono">
              <span className="text-white text-2xl font-bold tabular-nums">
                {analytics ? analytics.views_30d.toLocaleString() : '—'}
              </span>
              <span className="text-white/40 text-xs">monthly active users</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
