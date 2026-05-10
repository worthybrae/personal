import { useState } from 'react';
import TabBar, { type TabId } from './TabBar';
import OverviewPanel from './OverviewPanel';
import WebsitesPanel from './WebsitesPanel';
import ArtPanel from './ArtPanel';
import BlogPanel from './BlogPanel';

const PANELS: Record<TabId, () => JSX.Element> = {
  overview: OverviewPanel,
  websites: WebsitesPanel,
  art: ArtPanel,
  blog: BlogPanel,
};

export default function ContentSection() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const ActivePanel = PANELS[activeTab];

  return (
    <section className="relative z-10 h-screen snap-start flex flex-col">
      {/* Semi-transparent backdrop for readability */}
      <div className="absolute inset-0 bg-[#08080c]/75 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full max-w-2xl mx-auto w-full px-6">
        {/* Tab bar */}
        <div className="pt-6 pb-2">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Active panel — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          <ActivePanel />
        </div>
      </div>
    </section>
  );
}
