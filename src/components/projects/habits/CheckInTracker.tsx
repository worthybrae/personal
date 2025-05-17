import { DailyLog } from '../../../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { format, isToday, isSameDay, isYesterday } from 'date-fns';

interface CheckInTrackerProps {
  logs: DailyLog[];
}

interface ContributionDay {
  date: string;
  count: number;
}

interface MonthData {
  month: string;
  days: ContributionDay[];
}

export function CheckInTracker({ logs }: CheckInTrackerProps) {
  // Calculate current streak
  const calculateStreak = (): number => {
    if (logs.length === 0) return 0;

    const sortedDates = logs
      .map(log => new Date(log.date))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let currentDate = new Date();

    // If today doesn't have a check-in, check if yesterday does
    if (!sortedDates.some(date => isToday(date))) {
      if (!sortedDates.some(date => isYesterday(date))) {
        return 0;
      }
      currentDate = new Date(currentDate.setDate(currentDate.getDate() - 1));
    }

    for (const date of sortedDates) {
      if (isSameDay(date, currentDate)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (date < currentDate) {
        break;
      }
    }

    return streak;
  };

  // Function to generate contribution data grouped by months
  const generateMonthlyData = (): MonthData[] => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(today.getDate() - 364);

    // Create a map of dates with logs
    const logDates = new Set(logs.map(log => log.date));

    // Generate array of all dates in the last year grouped by month
    const monthlyData: MonthData[] = [];
    let currentMonth: MonthData | null = null;

    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const monthStr = format(d, 'MMMM yyyy');

      if (!currentMonth || currentMonth.month !== monthStr) {
        currentMonth = {
          month: monthStr,
          days: [],
        };
        monthlyData.push(currentMonth);
      }

      currentMonth.days.push({
        date: dateStr,
        count: logDates.has(dateStr) ? 1 : 0,
      });
    }

    return monthlyData.reverse(); // Most recent month first
  };

  const monthlyData = generateMonthlyData();
  const currentStreak = calculateStreak();

  return (
    <Card className="md:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Check-ins</CardTitle>
        <div className="text-lg font-semibold">
          {currentStreak} day{currentStreak !== 1 ? 's' : ''} streak
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] overflow-y-auto pr-4">
          <div className="space-y-8">
            {monthlyData.map((monthData, monthIndex) => (
              <div key={monthIndex} className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {monthData.month}
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(16px,1fr))] gap-2">
                  {monthData.days.map((day, dayIndex) => {
                    const formattedDate = format(new Date(day.date), 'MMMM d, yyyy');
                    const tooltipText = `${day.count ? '1 contribution' : 'No contributions'} on ${formattedDate}`;

                    return (
                      <div
                        key={dayIndex}
                        className={`w-3 h-3 rounded-sm transition-colors ${
                          day.count > 0
                            ? 'bg-emerald-500 hover:ring-1 hover:ring-emerald-300 hover:ring-offset-1'
                            : 'bg-[#ebedf0] dark:bg-[#161b22] hover:ring-1 hover:ring-gray-300 hover:ring-offset-1'
                        }`}
                        title={tooltipText}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}