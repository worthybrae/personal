const TABS = [
  { id: 'overview', label: 'OVERVIEW', color: '#06b6d4' },
  { id: 'websites', label: 'WEBSITES', color: '#06b6d4' },
  { id: 'art', label: 'ART', color: '#d946ef' },
  { id: 'blog', label: 'BLOG', color: '#eab308' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide font-mono text-xs md:text-sm">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="px-3 md:px-4 py-2 whitespace-nowrap transition-colors shrink-0"
            style={{
              color: isActive ? tab.color : '#555',
            }}
          >
            <span style={{ color: isActive ? tab.color + '80' : '#333' }}>[ </span>
            <span
              className="transition-all"
              style={{
                textShadow: isActive ? `0 0 10px ${tab.color}40` : 'none',
              }}
            >
              {tab.label}
            </span>
            <span style={{ color: isActive ? tab.color + '80' : '#333' }}> ]</span>
          </button>
        );
      })}
    </div>
  );
}
