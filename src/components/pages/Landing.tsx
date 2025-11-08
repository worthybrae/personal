import { Card, CardContent } from '@/components/ui/card';
import ContactForm from '../global/ContactForm';
import { Github, Music, Linkedin, Film } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
  title: string;
  description: string;
  type: 'video' | 'image';
  media: string;
  link: string;
}

interface ProjectMediaProps {
  project: Project;
}

const Landing = () => {
  const projects: Project[] = [
    {
      title: "streamclout.io",
      description: "A real-time analytics platform tracking and visualizing Spotify streaming data, artist performance, and music trends.",
      type: "video",
      media: "https://portfolio-worthy.s3.amazonaws.com/streamclout-demo.mp4",
      link: "/projects/streamclout"
    },
    {
      title: "Livestream Art",
      description: "Real-time artistic transformation of the iconic Abbey Road crossing livestream using computer vision and edge detection.",
      type: "video",
      media: "https://portfolio-worthy.s3.amazonaws.com/abbey_road_best.mp4",
      link: "/projects/livestream-art"
    },
    {
      title: "coderview",
      description: "An AI-powered platform for technical career development, offering resume analysis, GitHub portfolio review, and automated cover letter generation.",
      type: "video",
      media: "https://portfolio-worthy.s3.amazonaws.com/coderview-demo.mp4",
      link: "/projects/coderview"
    },
    {
      title: "AI Architecture",
      description: "A StyleGAN-based exploration of architectural design using machine learning to generate and manipulate architectural spaces.",
      type: "video",
      media: "https://portfolio-worthy.s3.amazonaws.com/flesh_digression.mp4",
      link: "/projects/ai-architecture"
    },
    {
      title: "Country Density",
      description: "A data visualization project that transforms population density data into stunning 3D renderings using R and the Rayshader library.",
      type: "image",
      media: "https://portfolio-worthy.s3.us-east-1.amazonaws.com/density-preview.png",
      link: "/projects/country-density"
    }
  ];

  const ProjectMedia = ({ project }: ProjectMediaProps) => (
    project.type === "video" ? (
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={project.media} type="video/mp4" />
      </video>
    ) : (
      <img
        src={project.media}
        alt={project.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
    )
  );

  return (
    <main className="relative overflow-hidden w-full">
      {/* Hero Section with Dark Overlay */}
      <section className="relative min-h-screen bg-black overflow-hidden w-full">
        {/* Mobile Background (AI Architecture) - Only shown on mobile */}
        <div className="md:hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full object-cover opacity-70"
            style={{
              minWidth: '100vw',
              maxWidth: '100vw',
              width: '100vw'
            }}
          >
            <source src={projects[3].media} type="video/mp4" />
          </video>
        </div>

        {/* Desktop Background (Livestream Art) - Only shown on desktop */}
        <div className="hidden md:block">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full object-cover opacity-70"
            style={{
              minWidth: '100vw',
              maxWidth: '100vw',
              width: '100vw'
            }}
          >
            <source src={projects[1].media} type="video/mp4" />
          </video>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/0" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 h-screen flex flex-col justify-center">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-7xl md:text-8xl font-bold mb-6 text-white">
              Worthy Rae
            </h1>
            <p className="text-xl md:text-2xl text-white mb-12 max-w-2xl mx-auto leading-relaxed">
              Data specialist who loves building things with Python and Typescript
            </p>

            <div className="flex flex-col gap-8">
              {/* Buttons */}
              <div className="flex gap-6 justify-center">
                <a
                  href="https://portfolio-worthy.s3.amazonaws.com/resume.pdf"
                  download
                  className="group relative px-8 py-4 bg-white text-black rounded-lg overflow-hidden hover:bg-gray-100 transition-all"
                >
                  <span className="relative z-10 inline-flex items-center gap-2">

                    <span className="font-medium">Resume</span>
                  </span>
                </a>
                <ContactForm />
              </div>

              {/* Social Icons */}
              <div className="flex gap-6 justify-center">
                <a
                  href="https://open.spotify.com/user/1225056983"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Music className="w-6 h-6" />
                </a>
                <a
                  href="https://www.linkedin.com/in/worthy-rae/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Linkedin className="w-6 h-6" />
                </a>
                <a
                  href="https://boxd.it/1a9Ux"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Film className="w-6 h-6" />
                </a>
                <a
                  href="https://github.com/worthybrae"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Github className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center text-white/80">
          <span className="text-sm mb-2">Scroll to explore</span>
          <div className="w-1 h-12 bg-white/10 rounded-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 animate-[scroll_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="bg-black py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-16 text-center text-white">Featured Projects</h2>
          <div className="space-y-32">
            {projects.map((project, index) => (
              <Card key={index} className="bg-black border-none overflow-hidden hover:scale-[1.02] transition-transform duration-500">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <ProjectMedia project={project} />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <h3 className="text-3xl font-bold mb-4 text-white">
                        {project.title}
                      </h3>
                      <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                        {project.description}
                      </p>
                      <Link
                        to={project.link}
                        className="inline-flex items-center gap-2 text-lg font-medium text-white/80 hover:text-white transition-colors"
                      >
                        View Project
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Landing;