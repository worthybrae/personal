import { DailyLog } from '../../../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts';

interface WeightChartProps {
  logs: DailyLog[];
}

interface WeightData {
  date: string;
  weight: number;
  fullDate: Date;
}

interface WeightChange {
  change: number;
  percentChange: number;
}

export function WeightChart({ logs }: WeightChartProps) {
  // Process weight data for the graph
  const weightData: WeightData[] = logs
    .filter(log => log.weight)
    .map(log => ({
      date: new Date(log.date).toLocaleDateString(),
      weight: log.weight || 0,
      fullDate: new Date(log.date),
    }))
    .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

  console.log('Weight Data:', weightData); // Debug log

  // Calculate 7-day weight change
  const calculateWeightChange = (): WeightChange | null => {
    if (weightData.length < 2) return null;

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentWeights = weightData.filter(data => data.fullDate >= sevenDaysAgo);
    if (recentWeights.length < 2) return null;

    const oldestWeight = recentWeights[0]?.weight;
    const newestWeight = recentWeights[recentWeights.length - 1]?.weight;

    if (typeof oldestWeight !== 'number' || typeof newestWeight !== 'number') return null;

    const percentChange = ((newestWeight - oldestWeight) / oldestWeight) * 100;

    return {
      change: newestWeight - oldestWeight,
      percentChange: percentChange,
    };
  };

  const weightChange = calculateWeightChange();

  const CustomTooltip = ({
    active,
    payload,
    label
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-primary">{`Weight: ${payload[0].value} lbs`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="md:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Weight Tracking</CardTitle>
        <div className="flex items-center space-x-4">
          {weightData.length > 0 && (
            <div className="text-lg font-semibold">
              {weightData[weightData.length - 1].weight} lbs
            </div>
          )}
          {weightChange && (
            <div className="flex items-center space-x-2">
              <div className={`text-sm font-medium ${
                weightChange.change > 0 ? 'text-red-500' : 'text-green-500'
              }`}>
                {weightChange.change > 0 ? '↑' : '↓'} {Math.abs(weightChange.change).toFixed(1)} lbs
              </div>
              <div className="text-xs text-muted-foreground">
                ({weightChange.percentChange > 0 ? '+' : ''}{weightChange.percentChange.toFixed(1)}% 7d)
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={weightData}
              margin={{ top: 5, right: 10, bottom: 20, left: 10 }}
            >
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
                dy={10}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                stroke="hsl(var(--muted-foreground))"
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: "hsl(var(--background))",
                  stroke: "hsl(var(--primary))",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}