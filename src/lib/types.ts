export type DailyLog = {
  id: string;
  date: string;
  weight?: number;
  exercise_notes?: string;
  food_notes?: string;
};

export type ContactSubmission = {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
};
