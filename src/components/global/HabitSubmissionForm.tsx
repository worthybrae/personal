import { useState } from 'react';
import { useSupabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Plus, Check } from 'lucide-react';
import { DailyLog } from '../../lib/types';

interface HabitSubmissionFormProps {
  onSubmitSuccess?: () => void;
  logs: DailyLog[];
}

export default function HabitSubmissionForm({ onSubmitSuccess, logs }: HabitSubmissionFormProps) {
  const { supabase } = useSupabase();
  const [weight, setWeight] = useState<string>('');
  const [exercise, setExercise] = useState<string>('');
  const [food, setFood] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // Check if there's a log for today
  const today = new Date().toISOString().split('T')[0];
  const hasLogForToday = logs.some(log => log.date === today);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Verify password against environment variable
    const submissionPassword = import.meta.env.VITE_HABIT_SUBMISSION_PASSWORD;
    if (!submissionPassword) {
      setError('Submission password not configured');
      return;
    }

    if (password !== submissionPassword) {
      setError('Incorrect password');
      return;
    }

    // Submit the log
    const { error: submitError } = await supabase
      .from('daily_logs')
      .upsert({
        date: today,
        weight: weight ? parseFloat(weight) : null,
        exercise_notes: exercise || null,
        food_notes: food || null,
      });

    if (submitError) {
      console.error('Error saving log:', submitError);
      setError('Failed to save log');
      return;
    }

    // Reset form and close dialog
    setWeight('');
    setExercise('');
    setFood('');
    setPassword('');
    setIsOpen(false);
    onSubmitSuccess?.();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={`gap-2 ${hasLogForToday ? 'bg-emerald-500 hover:bg-emerald-500' : ''}`}
          disabled={hasLogForToday}
        >
          {hasLogForToday ? (
            <>
              <Check className="w-4 h-4" />
              Logged Today
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Today's Log
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Daily Log</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Weight (optional)
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Enter your weight"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Exercise Notes
              <textarea
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                rows={3}
                placeholder="What exercise did you do today?"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Food Notes
              <textarea
                value={food}
                onChange={(e) => setFood(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                rows={3}
                placeholder="What did you eat today?"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Enter password to submit"
                required
              />
            </label>
          </div>

          {error && (
            <div className="text-destructive text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full">
            Save Today's Log
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}