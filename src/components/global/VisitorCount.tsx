import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

export default function VisitorCount() {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchViewCount();
  }, []);

  async function fetchViewCount() {
    try {
      const response = await fetch('/api/analytics');

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setViewCount(data.views);
      setError(false);
    } catch (err) {
      console.error('Error fetching view count:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg opacity-50 cursor-not-allowed flex items-center justify-center gap-2 min-h-[40px]">
        <Eye className="w-4 h-4 animate-pulse" />
        <span className="font-medium">...</span>
      </div>
    );
  }

  if (error || viewCount === null) {
    return null; // Don't show anything if there's an error
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2 cursor-default min-h-[40px]">
        <Eye className="w-4 h-4" />
        <span className="font-medium">{formatNumber(viewCount)}</span>
      </div>
      {showTooltip && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
          {viewCount.toLocaleString()} total views
        </div>
      )}
    </div>
  );
}
