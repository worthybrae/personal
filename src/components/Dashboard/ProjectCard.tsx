import { Link } from 'react-router-dom';
import Sparkline from './Sparkline';

interface ProjectCardProps {
  slug: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  views: number;
  sparkline: number[];
  tags: string[];
  link: string;
}

export default function ProjectCard({
  title, description, mediaUrl, mediaType, views, sparkline, tags, link,
}: ProjectCardProps) {
  return (
    <Link
      to={link}
      className="block bg-white/[0.02] border border-cyber-cyan/10 rounded-md overflow-hidden hover:border-cyber-cyan/30 transition-colors group"
    >
      <div className="h-40 bg-gradient-to-br from-[#0a1628] to-[#0f2440] overflow-hidden">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <span className="text-[10px] font-mono text-cyber-green">● live</span>
        </div>
        <p className="text-xs text-muted mt-1">{description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="font-mono">
            <span className="text-xl font-bold text-cyber-cyan">{views.toLocaleString()}</span>
            <span className="text-[10px] text-cyber-dim ml-1">views</span>
          </div>
          <Sparkline data={sparkline} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 bg-cyber-cyan/10 text-cyber-cyan rounded font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
