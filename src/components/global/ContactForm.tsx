import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ContactForm = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = {
      first_name: (form.firstName as HTMLInputElement).value,
      last_name: (form.lastName as HTMLInputElement).value,
      email: (form.email as HTMLInputElement).value,
      message: (form.message as HTMLInputElement).value,
    };

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert([formData]);

      if (error) throw error;

      form.reset();
      setOpen(false);
      alert('Thanks for your message!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors"
        >
          Get in Touch
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] [&>button]:bg-white [&>button]:border [&>button]:border-gray-200 [&>button]:hover:bg-gray-50">
        <DialogHeader>
          <DialogTitle>Contact Me</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First name
              </label>
              <Input id="firstName" name="firstName" placeholder="First name" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last name
              </label>
              <Input id="lastName" name="lastName" placeholder="Last name" required />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              placeholder="Your message here..."
              required
              className="min-h-[100px]"
            />
          </div>
          <button 
            type="submit" 
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactForm;