// src/pages/AppsPage.tsx

import TerrainLayout from '@/components/Layout/TerrainLayout';

const APPS = [
  {
    name: 'CodeView',
    description: 'AI-powered career development platform',
    url: 'https://github.com/worthybrae/coderview',
  },
  {
    name: 'StreamClout',
    description: 'Real-time Spotify streaming analytics',
    url: 'https://github.com/worthybrae/streamclout',
  },
];

export default function AppsPage() {
  return (
    <TerrainLayout title="APPS">
      <div className="space-y-4">
        {APPS.map((app) => (
          <a
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#08080c]/85 backdrop-blur-xl border border-cyber-cyan/15 rounded-lg p-6 hover:border-cyber-cyan/40 transition-colors"
          >
            <h2 className="font-mono text-lg font-bold text-white">{app.name}</h2>
            <p className="font-mono text-sm text-white/50 mt-1">{app.description}</p>
            <span className="font-mono text-xs text-cyber-cyan mt-3 inline-block">
              {app.url.replace('https://', '')} →
            </span>
          </a>
        ))}
      </div>
    </TerrainLayout>
  );
}
