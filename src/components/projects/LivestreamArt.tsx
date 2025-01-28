// src/components/projects/LivestreamArt.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Github } from 'lucide-react';

const LivestreamArt = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Side-by-Side Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Video on the left */}
          <div className="relative aspect-video rounded-lg overflow-hidden">
          <video 
              key="abbey-road-stream"
              autoPlay 
              muted 
              loop 
              playsInline
              controls
              className="w-full h-full object-cover"
            >
              <source 
                src="https://portfolio-worthy.s3.amazonaws.com/abbey-road-stream.mp4"
                type="video/mp4"
              />
            </video>
          </div>
          
          {/* Text content on the right */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Livestream Art
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Real-time artistic transformation of the iconic Abbey Road crossing livestream using computer vision and edge detection.
            </p>
            <a 
              href="https://github.com/worthybrae/livestream-morphing"
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
            {/* Technical Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  This project processes the Abbey Road livestream in real-time, applying computer vision techniques to create an artistic edge-detection visualization. The system includes:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Real-time video stream processing</li>
                  <li>OpenCV-based edge detection</li>
                  <li>Dynamic contrast adjustment based on time of day</li>
                  <li>Automated timestamp and location overlay</li>
                </ul>
              </CardContent>
            </Card>

            {/* Implementation Details */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Processing Pipeline:</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Frame extraction from HLS stream</li>
                    <li>Gaussian blur for noise reduction</li>
                    <li>Canny edge detection with adaptive thresholds</li>
                    <li>Morphological operations for edge smoothing</li>
                    <li>Dynamic text overlay with time and location</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Backend Processing</CardTitle>
                </CardHeader>
                <CardContent>   
                    {/* Celery Backend Visualization */}
                    <div className="">
                        <div className="rounded-lg overflow-hidden border">
                        <img 
                    src="https://portfolio-worthy.s3.amazonaws.com/celery.png" 
                    alt="Celery Backend Visualization"
                    className="w-full"
                  />
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground">
                        Visualization of the Celery task queue system showing real-time processing statistics and worker status
                        </p>
                    </div>
                </CardContent>
            </Card>
          </div>


          {/* Right Column */}
          <div className="space-y-8">
            {/* System Architecture */}
            <Card>
              <CardHeader>
                <CardTitle>System Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p className="text-muted-foreground">
                    The system utilizes a distributed architecture with multiple components working in harmony to process the livestream in real-time:
                  </p>
                  
                  {/* Architecture Diagram */}
                  <div className="rounded-lg overflow-hidden border">
                  <img 
                    src="https://portfolio-worthy.s3.amazonaws.com/architecture.png" 
                    alt="System Architecture Diagram"
                    className="w-full"
                  />
                  </div>

                  
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium mb-2">Key Statistics:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Processing Rate: 30 FPS</li>
                      <li>• Average Latency: 200ms</li>
                      <li>• Stream Resolution: 1920x1080</li>
                      <li>• Edge Detection Time: 33ms/frame</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Future Enhancements */}
            <Card>
              <CardHeader>
                <CardTitle>Future Enhancements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Machine learning-based object detection</li>
                  <li>Additional artistic style variations</li>
                  <li>Interactive controls for visual parameters</li>
                  <li>Historical footage archiving and playback</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivestreamArt;