interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({ data, color = '#00aaff', width = 80, height = 24 }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = padding + ((max - val) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}
