// src/components/global/PageTemplate.tsx
import React from 'react';
import { Github, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MediaItem {
  type: 'image' | 'video' | 'custom';
  src?: string;
  caption?: string;
  alt?: string;
  component?: () => React.ReactNode;
}

interface ProjectProps {
  title: string;
  subtitle: string;
  heroMedia: MediaItem;
  githubUrl: string;
  visitSiteUrl?: string;
  sections: {
    title: string;
    content: string;
    media?: MediaItem;
    additionalMedia?: MediaItem[];
  }[];
  relatedProjects?: {
    title: string;
    description: string;
    link: string;
    image: string;
  }[];
  renderCustomSections?: React.ReactNode;
}

const MediumStyleProject: React.FC<ProjectProps> = ({
  title,
  subtitle,
  heroMedia,
  githubUrl,
  visitSiteUrl,
  sections,
  relatedProjects,
  renderCustomSections,
}) => {
  // Render hero media based on its type
  const renderHeroMedia = (media: MediaItem) => {
    if (media.type === 'custom' && media.component) {
      return media.component();
    } else if (media.type === 'video' && media.src) {
      return (
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          controls
          className="w-full h-auto"
        >
          <source src={media.src} type="video/mp4" />
        </video>
      );
    } else if (media.type === 'image' && media.src) {
      return (
        <img 
          src={media.src}
          alt={media.alt || title}
          className="w-full h-auto"
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Side by Side Layout */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 mb-16 items-center">
          <div className="w-full rounded-lg overflow-hidden">
            {renderHeroMedia(heroMedia)}
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-relaxed">
              {title}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </a>
              
              {visitSiteUrl && (
                <a 
                  href={visitSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Globe className="w-5 h-5" />
                  Visit Site
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 py-12 medium-article">
        {/* Introduction paragraph with larger font */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Introduction</h2>
          <p className="text-xl leading-relaxed text-muted-foreground">
            {sections[0]?.content}
          </p>
        </div>

        {/* Use custom sections rendering if provided, otherwise use default */}
        {renderCustomSections || sections.slice(1).map((section, index) => (
          <section key={index} className="mb-16">
            <h2 className="text-3xl font-bold mb-6">{section.title}</h2>
            <p className="text-lg leading-relaxed mb-8 text-muted-foreground">
              {section.content}
            </p>
            
            {section.media && section.media.type === 'image' && (
              <figure className="my-10">
                <img
                  src={section.media.src}
                  alt={section.media.alt || section.title}
                  className="w-full h-auto rounded-lg"
                />
                {section.media.caption && (
                  <figcaption className="text-sm text-center mt-2 text-muted-foreground">
                    {section.media.caption}
                  </figcaption>
                )}
              </figure>
            )}

            {section.media && section.media.type === 'video' && (
              <figure className="my-10">
                <video
                  controls
                  autoPlay
                  muted
                  className="w-full h-auto rounded-lg"
                >
                  <source src={section.media.src} type="video/mp4" />
                </video>
                {section.media.caption && (
                  <figcaption className="text-sm text-center mt-2 text-muted-foreground">
                    {section.media.caption}
                  </figcaption>
                )}
              </figure>
            )}
          </section>
        ))}

        {/* Divider */}
        <div className="my-20 flex justify-center">
          <div className="w-24 h-0.5 bg-gray-200"></div>
        </div>

        {/* Related Projects */}
        {relatedProjects && relatedProjects.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">More Projects</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {relatedProjects.map((project, index) => {
                const isVideo = project.image.endsWith('.mp4') || project.image.endsWith('.webm');
                
                return (
                  <Link to={project.link} key={index} className="block group">
                    <div className="relative overflow-hidden rounded-lg aspect-video mb-4">
                      {isVideo ? (
                        <video
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        >
                          <source src={project.image} type="video/mp4" />
                        </video>
                      ) : (
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300"></div>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-muted-foreground">{project.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};

export default MediumStyleProject;