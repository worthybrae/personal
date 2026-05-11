import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Mail } from 'lucide-react';

interface ContactFormProps {
  compact?: boolean;
}

const ContactForm = ({ compact = false }: ContactFormProps) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch('https://formspree.io/f/xdkyngrb', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

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
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2 min-h-[40px]"
        >
          {compact ? (
            <>
              <span className="hidden md:inline">Get in Touch</span>
              <Mail className="w-4 h-4 md:hidden" />
            </>
          ) : (
            <span>Get in Touch</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#0f0f15] border-white/[0.1] text-white">
        <DialogHeader>
          <DialogTitle>Contact Me</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-muted font-mono text-xs">
                First name
              </label>
              <Input id="firstName" name="firstName" placeholder="First name" required className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-muted" />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-muted font-mono text-xs">
                Last name
              </label>
              <Input id="lastName" name="lastName" placeholder="Last name" required className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-muted font-mono text-xs">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-muted" />
          </div>
          <div className="space-y-2">
            <label htmlFor="message" className="text-muted font-mono text-xs">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              placeholder="Your message here..."
              required
              className="min-h-[100px] bg-white/[0.05] border-white/[0.1] text-white placeholder:text-muted"
            />
          </div>
          <button
            type="submit"
            className="bg-cyber-cyan text-black font-mono hover:bg-cyber-cyan/80 w-full px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
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