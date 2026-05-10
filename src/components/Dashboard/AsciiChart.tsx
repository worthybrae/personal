const SPARK_CHARS = '▁▂▃▄▅▆▇█';

interface SparklineProps {
  data: number[];
  color?: string;
}

export function Sparkline({ data, color = '#06b6d4' }: SparklineProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const chars = data.map((v) => {
    const idx = Math.round((v / max) * (SPARK_CHARS.length - 1));
    return SPARK_CHARS[idx];
  });

  return (
    <span className="font-mono text-sm tracking-tight" style={{ color }}>
      {chars.join('')}
    </span>
  );
}

interface AsciiBarProps {
  label: string;
  value: number;
  maxValue: number;
  barWidth?: number;
  color?: string;
}

export function AsciiBar({ label, value, maxValue, barWidth = 20, color = '#06b6d4' }: AsciiBarProps) {
  const filled = maxValue > 0 ? Math.round((value / maxValue) * barWidth) : 0;
  const empty = barWidth - filled;

  return (
    <div className="font-mono text-xs flex items-center gap-2">
      <span className="w-24 text-right" style={{ color }}>
        {label}
      </span>
      <span style={{ color }}>
        {'█'.repeat(filled)}{'░'.repeat(empty)}
      </span>
      <span className="text-white/40">{value.toLocaleString()}</span>
    </div>
  );
}

interface CountUpProps {
  value: number;
  className?: string;
}

export function CountUp({ value, className = '' }: CountUpProps) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {value.toLocaleString()}
    </span>
  );
}
