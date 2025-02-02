import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, ChevronLeft, ChevronRight, X } from 'lucide-react';

const CountryDensity = () => {
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const countries = [
    { name: 'Moldova', image: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/moldova.jpg' },
    { name: 'Ukraine', image: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/ukraine.jpg' },
    { name: 'Turkey', image: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/turkey.jpg' },
    { name: 'Moldova', image: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/moldova.jpg' },
    { name: 'Kuwait', image: 'https://portfolio-worthy.s3.us-east-1.amazonaws.com/kuwait.jpg' }
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % countries.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + countries.length) % countries.length);
  };

  const codeSnippets = [
    {
      title: '3D Rendering with Rayshader',
      code: `# Create the initial 3D object
combined_mat %>%
  rayshader::height_shade(
    texture = colorRampPalette(c(
      "transparent", "#d6ce93", "#ffba08", 
      "#faa307", "#f48c06", "#e85d04", 
      "#dc2f02", "#d00000", "#9d0208", 
      "#6a040f", "#370617", "#03071e"
    ))(256)
  ) %>%
  rayshader::plot_3d(
    heightmap = combined_mat,
    solid = F,
    zscale = 20,
    shadowdepth = 0
  )`
    },
    {
      title: 'High-Quality Rendering',
      code: `rayshader::render_highquality(
  filename = output_image_name,
  interactive = FALSE,
  lightdirection = 280,
  lightaltitude = c(20, 80),
  lightcolor = c("#ffba08"),
  lightintensity = c(600, 100),
  samples = 450,
  width = width, height = height
)`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="relative w-full h-auto">
            <img 
               src="https://portfolio-worthy.s3.us-east-1.amazonaws.com/density-preview.png"


              alt="Moldova Population Density"
              className="w-full h-auto rounded-lg"
            />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Country Density
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A data visualization project that transforms population density data into stunning 3D renderings using R and the Rayshader library.
            </p>
            <a 
              href="https://github.com/worthybrae/country-density"
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
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This project creates visually striking 3D visualizations of population density across different countries. 
                  By combining geospatial data with advanced rendering techniques, we transform raw population statistics 
                  into intuitive and aesthetically pleasing 3D landscapes.
                </p>
              </CardContent>
            </Card>

            {/* Visualization Gallery */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Visualization Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => setShowGallery(true)}
                >
                  <img 
                    src={countries[1].image}
                    alt="Gallery Preview"
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full">
                    +4
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      View Gallery
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Data processing using R and geospatial libraries</li>
                  <li>3D rendering with Rayshader for high-quality visualizations</li>
                  <li>Custom color gradients for intuitive density representation</li>
                  <li>Automated boundary detection and rendering</li>
                  <li>Optimized lighting and shadow effects</li>
                </ul>
              </CardContent>
            </Card>

            
          </div>

          {/* Right Column */}
          <div className="space-y-8">

            {/* Technical Implementation */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Technical Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {codeSnippets.map((snippet, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="text-lg font-medium">{snippet.title}</h3>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm whitespace-pre-wrap break-words">{snippet.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full max-w-6xl px-4">
            {/* Move close button outside the image container and increase z-index */}
            <button
              onClick={() => setShowGallery(false)}
              className="fixed top-4 right-4 z-[60] bg-black bg-opacity-50 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative">
              <div className="h-[70vh] flex items-center justify-center">
                <img
                  src={countries[currentImageIndex].image}
                  alt={countries[currentImageIndex].name}
                  className="h-full w-full object-contain"
                />
              </div>
              <button
                onClick={previousImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryDensity;