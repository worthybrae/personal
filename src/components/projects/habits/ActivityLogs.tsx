import { DailyLog } from '../../../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

interface ActivityLogsProps {
  logs: DailyLog[];
}

export function ActivityLogs({ logs }: ActivityLogsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="exercise" className="w-full">
          <div className="border rounded-lg p-1 w-fit mb-4">
            <TabsList className="bg-transparent gap-2">
              <TabsTrigger value="exercise" className="data-[state=active]:bg-background">Exercise</TabsTrigger>
              <TabsTrigger value="food" className="data-[state=active]:bg-background">Food</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="exercise">
            <div className="space-y-4">
              {logs
                .filter(log => log.exercise_notes)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(log => (
                  <div key={log.date} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                    <p className="font-medium mb-1">{new Date(log.date).toLocaleDateString()}</p>
                    <p className="text-muted-foreground">{log.exercise_notes}</p>
                  </div>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="food">
            <div className="space-y-4">
              {logs
                .filter(log => log.food_notes)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(log => (
                  <div key={log.date} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                    <p className="font-medium mb-1">{new Date(log.date).toLocaleDateString()}</p>
                    <p className="text-muted-foreground">{log.food_notes}</p>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}