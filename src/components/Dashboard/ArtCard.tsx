import { Link } from 'react-router-dom';

interface ArtCardProps {
  title: string;
  description: string;
  imageUrl: string;
  views: number;
  link: string;
}

export default function ArtCard({ title, description, imageUrl, views, link }: ArtCardProps) {
  return (
    <Link
      to={link}
      className="block bg-white/[0.02] border border-cyber-magenta/10 rounded-md overflow-hidden hover:border-cyber-magenta/30 transition-colors group"
    >
      <div className="h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-muted mt-1">{description}</p>
        <div className="mt-2 font-mono text-xs text-cyber-magenta">
          {views.toLocaleString()} views
        </div>
      </div>
    </Link>
  );
}
