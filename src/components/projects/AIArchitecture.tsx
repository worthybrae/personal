// src/components/projects/AIArchitecture.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Github } from 'lucide-react';

const AIArchitecture = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-black">
            <video 
              key="flesh-digression-video"
              autoPlay 
              muted 
              loop 
              playsInline
              controls
              className="w-full h-full object-contain"
            >
              <source 
                src="https://portfolio-worthy.s3.amazonaws.com/flesh_digression.mp4"
                type="video/mp4"
              />
            </video>
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-relaxed">
              AI Architecture
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A StyleGAN-based exploration of architectural design using machine learning to generate and manipulate architectural spaces.
            </p>
            <a 
              href="https://github.com/worthybrae/AI-Architecture"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity w-fit"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Project Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This project aimed to create an AI model capable of generating and manipulating architectural designs using StyleGAN technology. The key components included automated data collection, model training, and implementation of various image manipulation techniques.
                </p>
              </CardContent>
            </Card>

            {/* Data Collection Process */}
            <Card>
              <CardHeader>
                <CardTitle>Data Collection Process</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                  <li>Automated web scraping using Selenium WebDriver</li>
                  <li>Image processing with PIL for standardization</li>
                  <li>Filtering for high-resolution images (minimum 512x512)</li>
                  <li>Automatic cropping and resizing of images</li>
                </ul>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">Key Statistics:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Pages Scraped: 578</li>
                    <li>• Total Images: 447</li>
                    <li>• Image Resolution: 512x512</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Training Dataset */}
            <Card>
              <CardHeader>
                <CardTitle>Training Dataset</CardTitle>
              </CardHeader>
              <CardContent>
              <img 
                src="https://portfolio-worthy.s3.amazonaws.com/real-collage.jpg" 
                alt="Training dataset collage"
                className="rounded-lg w-full"
              />
                <p className="mt-4 text-muted-foreground">
                  Curated collection of high-quality architectural images used to train the StyleGAN model.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Model Training Details */}
            <Card>
              <CardHeader>
                <CardTitle>Model Training</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Training Process</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Base model: StyleGAN2-ADA</li>
                      <li>Training duration: ~24 hours</li>
                      <li>Batch size: 64 images</li>
                      <li>Resolution: 256x256</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Parameters</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Learning rate: 0.0002</li>
                      <li>Beta values: [0, 0.99]</li>
                      <li>Loss function: ProjectedGANLoss</li>
                      <li>Augmentation: Enabled</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generated Results */}
            <Card>
              <CardHeader>
                <CardTitle>AI Generated Results</CardTitle>
              </CardHeader>
              <CardContent>
              <img 
                src="https://portfolio-worthy.s3.amazonaws.com/generated-collage.png" 
                alt="AI generated images collage"
                className="rounded-lg w-full"
              />
                <p className="mt-4 text-muted-foreground">
                  Examples of architectural spaces generated by the trained StyleGAN model.
                </p>
              </CardContent>
            </Card>

            {/* Impact & Results */}
            <Card>
              <CardHeader>
                <CardTitle>Results & Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  The project successfully demonstrated the potential of StyleGAN in architectural design generation. 
                  The flesh digression implementation, shown in the header video, represents a novel approach to 
                  architectural form manipulation, creating organic transformations between different architectural styles.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIArchitecture;