import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Github } from 'lucide-react';

const SpotifyStreams = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Side-by-Side Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Video on the left */}
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <video 
              key="spotify-analytics-demo"
              autoPlay 
              muted 
              loop 
              playsInline
              controls
              className="w-full h-full object-cover"
            >
              <source 
                src={import.meta.env.DEV ? '/assets/spotify-streams/demo.mp4' : '/assets/spotify-streams/demo.mp4'}
                type="video/mp4"
              />
            </video>
          </div>
          
          {/* Text content on the right */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Spotify Streams
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A real-time analytics platform tracking and visualizing Spotify streaming data, artist performance, and music trends using Django and Python.
            </p>
            <a 
              href="https://github.com/worthybrae/musicstreams"
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
                <p className="text-muted-foreground mb-4">
                  This platform provides comprehensive analytics for Spotify streaming data, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Real-time tracking of album and song performance</li>
                  <li>Daily stream growth and trend analysis</li>
                  <li>Artist performance metrics and rankings</li>
                  <li>Advanced statistical analysis and visualizations</li>
                </ul>
              </CardContent>
            </Card>

            {/* Technical Architecture */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Backend Stack:</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Django web framework for robust data management</li>
                    <li>PostgreSQL database for streaming analytics</li>
                    <li>Custom data processing pipeline for Spotify API integration</li>
                    <li>Statistical analysis using NumPy and SciPy</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Analytics Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border">
                  <img 
                    src="/assets/spotify-streams/analytics.png" 
                    alt="Analytics Dashboard"
                    className="w-full"
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Comprehensive dashboard showing real-time streaming metrics, growth trends, and artist performance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Key Features */}
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium mb-2">Analytics Capabilities:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Real-time stream counting and tracking</li>
                      <li>• Daily growth rate calculations</li>
                      <li>• Statistical distribution analysis</li>
                      <li>• Automated performance benchmarking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border">
                  <img 
                    src="/assets/spotify-streams/stats.png" 
                    alt="Revenue Metrics"
                    className="w-full"
                  />
                </div>
                <p className="mt-4 text-muted-foreground">
                  Detailed performance metrics showing stream counts, growth rates, and trend analysis
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotifyStreams;