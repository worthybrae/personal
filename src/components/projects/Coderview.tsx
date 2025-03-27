// src/components/projects/Coderview.tsx
import MediumStyleProject from '../global/PageTemplate';

const Coderview = () => {
  const projectData = {
    title: "Coderview",
    subtitle: "An AI-powered platform for technical career development, offering resume analysis, GitHub portfolio review, and automated cover letter generation.",
    heroMedia: {
      type: 'video' as const,
      src: "https://portfolio-worthy.s3.amazonaws.com/coderview-demo.mp4",
    },
    githubUrl: "https://github.com/worthybrae/coderview",
    visitSiteUrl: "https://coderview-ai.com",
    sections: [
      {
        title: "Introduction",
        content: "Coderview is an integrated AI platform that helps developers optimize their technical careers through automated analysis of their professional materials. By leveraging advanced natural language processing and machine learning techniques, the system provides detailed feedback on resumes, GitHub portfolios, and generates tailored cover letters that highlight relevant technical skills and achievements. The platform aims to simplify the job search process for software engineers by giving them actionable, specific, and personalized insights to improve their application materials.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/overall_architecture.png",
          caption: "Coderview system architecture diagram showing the integration of React, FastAPI, Supabase, and AWS components"
        }
      },
      {
        title: "Resume Analysis Engine",
        content: "The resume analysis system provides comprehensive evaluation across multiple dimensions including work experience, education, projects, and certifications. Using a sophisticated scoring algorithm, each section is analyzed for impact, relevance, and presentation quality. The system identifies strengths and weaknesses, suggests specific improvements, and provides actionable feedback tailored to technical roles.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/resume_analysis_flow.png",
          caption: "Resume analysis workflow from document upload to processing and results"
        },
        additionalMedia: [
          {
            type: 'custom' as const,
            component: () => (
              <div style={{ position: 'relative', boxSizing: 'content-box', maxHeight: '80vh', width: '100%', aspectRatio: '1.8864628820960698', padding: '40px 0 40px 0' }}>
                <iframe 
                  src="https://app.supademo.com/embed/cm8rfg679023k2wuwidzaktry?embed_v=2" 
                  loading="lazy" 
                  title="coderview resume review demo" 
                  allow="clipboard-write" 
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            ),
            caption: "Interactive demo of the Coderview resume analysis feature"
          }
        ]
      },
      {
        title: "GitHub Portfolio Evaluation",
        content: "The GitHub analysis module provides developers with a comprehensive evaluation of their public repositories. The system extracts code from repositories and analyzes multiple dimensions including code quality, architecture, security practices, documentation, and testing coverage. Using a sophisticated scoring algorithm, each repository receives detailed feedback with specific strengths and improvement opportunities, helping developers present their strongest technical work to potential employers.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/github_analysis_flow.png",
          caption: "GitHub repository analysis workflow showing the process of code evaluation"
        },
        additionalMedia: [
          {
            type: 'custom' as const,
            component: () => (
              <div style={{ position: 'relative', boxSizing: 'content-box', maxHeight: '80vh', width: '100%', aspectRatio: '1.8864628820960698', padding: '40px 0 40px 0' }}>
                <iframe 
                  src="https://app.supademo.com/embed/cm8rfqlwc02e82wuwfkjzumec?embed_v=2" 
                  loading="lazy" 
                  title="coderview github review demo" 
                  allow="clipboard-write" 
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            ),
            caption: "Interactive demo of the GitHub portfolio analysis feature"
          }
        ]
      },
      {
        title: "AI Cover Letter Generator",
        content: "The cover letter generator creates personalized, professional cover letters by analyzing the user's resume and the specific job description. The system identifies the most relevant skills and experiences from the resume that align with the job requirements, and structures them into a compelling narrative. The generator includes customization options for tone and style, ranging from formal to conversational, ensuring the final document matches the user's preferences while maintaining professional standards.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/create_cover_letter_flow.png",
          caption: "Cover letter generation workflow showing the process from input to PDF creation"
        },
        additionalMedia: [
          {
            type: 'custom' as const,
            component: () => (
              <div style={{ position: 'relative', boxSizing: 'content-box', maxHeight: '80vh', width: '100%', aspectRatio: '1.8864628820960698', padding: '40px 0 40px 0' }}>
                <iframe 
                  src="https://app.supademo.com/embed/cm8rfvz8302kc2wuwkriwrmlr?embed_v=2" 
                  loading="lazy" 
                  title="coderview cover letter demo" 
                  allow="clipboard-write" 
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            ),
            caption: "Interactive demo of the AI cover letter generation feature"
          }
        ]
      },
      {
        title: "Technical Implementation",
        content: "The system architecture is built on a modern tech stack with FastAPI for the backend, React with TypeScript for the frontend, and OpenAI's GPT models for AI processing. The platform utilizes a distributed processing system to handle multiple concurrent analysis requests efficiently. Document processing is managed through specialized libraries like PDFPlumber for PDF extraction and docx2txt for Word documents, ensuring accurate text extraction across different file formats. Data is securely stored in AWS S3 with proper encryption and access controls."
      },
      {
        title: "Data Security and Privacy",
        content: "The Coderview platform implements robust security measures to protect user data. All resume and job description data is encrypted both in transit and at rest using industry-standard protocols. The system utilizes temporary storage for uploaded documents, securely processing them and then removing them after analysis is complete. User authentication is handled through a secure OAuth implementation with proper session management and role-based access controls."
      },
      {
        title: "Future Development",
        content: "The Coderview roadmap includes several planned enhancements to further improve the platform's capabilities. Upcoming features include an interview preparation module with personalized technical question recommendations based on a user's GitHub repositories and resume. Additionally, a salary negotiation advisor will help users leverage their technical achievements to maximize compensation packages. The system will also expand its integrations to include LinkedIn profile analysis and optimization."
      }
    ],
    relatedProjects: [
      {
        title: "streamclout.io",
        description: "A real-time analytics platform tracking and visualizing Spotify streaming data, artist performance, and music trends.",
        link: "/projects/streamclout",
        image: "https://portfolio-worthy.s3.amazonaws.com/streamclout-demo.mp4"
      },
      {
        title: "Country Density",
        description: "A data visualization project that transforms population density data into stunning 3D renderings using R and the Rayshader library.",
        link: "/projects/country-density",
        image: "https://portfolio-worthy.s3.us-east-1.amazonaws.com/density-preview.png"
      },
      {
        title: "Livestream Art",
        description: "Real-time artistic transformation of the iconic Abbey Road crossing livestream using computer vision and edge detection.",
        link: "/projects/livestream-art",
        image: "https://portfolio-worthy.s3.amazonaws.com/abbey_road_best.mp4"
      },
      {
        title: "AI Architecture",
        description: "A StyleGAN-based exploration of architectural design using machine learning.",
        link: "/projects/ai-architecture",
        image: "https://portfolio-worthy.s3.amazonaws.com/flesh_digression.mp4"
      }
    ]
  };

  // Define types for the props
  interface MediaItem {
    type: 'image' | 'video' | 'custom';
    src?: string;
    caption?: string;
    alt?: string;
    component?: () => React.ReactNode;
  }

  interface Section {
    title: string;
    content: string;
    media?: MediaItem;
    additionalMedia?: MediaItem[];
  }

  interface CustomProjectProps {
    sections: Section[];
    [key: string]: any; // For other props
  }

  // Create custom rendering function to handle both media and additionalMedia
  const CustomMediumStyleProject = (props: CustomProjectProps) => {
    const { sections, ...rest } = props;
    
    // Custom render function for section that handles both media and additionalMedia
    const renderSections = () => {
      return sections.map((section: Section, index: number) => {
        const { title, content, media, additionalMedia } = section;
        
        return (
          <section key={index} className="mb-16">
            <h2 className="text-3xl font-bold mb-6">{title}</h2>
            <div className="max-w-none">
              <p className="text-lg leading-relaxed mb-8 text-muted-foreground">
                {content}
              </p>

              {/* Primary Media */}
              {media && (
                <figure className="my-10">
                  {media.type === 'image' && (
                    <img
                      src={media.src}
                      alt={media.alt || title}
                      className="w-full h-auto rounded-lg"
                    />
                  )}
                  {media.type === 'video' && (
                    <video
                      controls
                      autoPlay
                      muted
                      className="w-full h-auto rounded-lg"
                    >
                      <source src={media.src} type="video/mp4" />
                    </video>
                  )}
                  {media.type === 'custom' && media.component && media.component()}
                  {media.caption && (
                    <figcaption className="text-sm text-center mt-2 text-muted-foreground">
                      {media.caption}
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Additional Media Items */}
              {additionalMedia && additionalMedia.map((addMedia: MediaItem, mediaIndex: number) => (
                <figure key={mediaIndex} className="my-10">
                  {addMedia.type === 'custom' && addMedia.component && addMedia.component()}
                  {addMedia.caption && (
                    <figcaption className="text-sm text-center mt-2 text-muted-foreground">
                      {addMedia.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        );
      });
    };

    // Return the modified MediumStyleProject component with custom section rendering
    return (
      <div className="min-h-screen bg-background">
        <MediumStyleProject
          title={rest.title}
          subtitle={rest.subtitle}
          heroMedia={rest.heroMedia}
          githubUrl={rest.githubUrl}
          visitSiteUrl={rest.visitSiteUrl}
          sections={sections}
          relatedProjects={rest.relatedProjects}
          renderCustomSections={renderSections()}
        />
      </div>
    );
  };

  return <CustomMediumStyleProject {...projectData} />;
};

export default Coderview;