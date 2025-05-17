import { useState, useEffect } from 'react';
import { useSupabase } from '../../../lib/supabase';
import { DailyLog } from '../../../lib/types';
import HabitSubmissionForm from '../../global/HabitSubmissionForm';
import { WeightChart } from './WeightChart';
import { CheckInTracker } from './CheckInTracker';
import { ActivityLogs } from './ActivityLogs';

export default function HabitsPage() {
  const { supabase } = useSupabase();
  const [logs, setLogs] = useState<DailyLog[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching logs:', error);
      return;
    }

    setLogs(data || []);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Daily Habits
          </h1>
          <HabitSubmissionForm onSubmitSuccess={fetchLogs} logs={logs} />
        </div>

        {/* Two-column layout for weight tracking and check-in tracker */}
        <div className="grid md:grid-cols-2 gap-6">
          <WeightChart logs={logs} />
          <CheckInTracker logs={logs} />
        </div>

        {/* Activity Logs */}
        <ActivityLogs logs={logs} />
      </div>
    </div>
  );
}