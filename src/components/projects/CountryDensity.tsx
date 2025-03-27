// src/components/projects/CountryDensity.tsx
import MediumStyleProject from '../global/PageTemplate';

const CountryDensity = () => {
  const projectData = {
    title: "Country Density",
    subtitle: "A data visualization project that transforms population density data into stunning 3D renderings using R and the Rayshader library.",
    heroMedia: {
      type: 'image' as const,
      src: "https://portfolio-worthy.s3.us-east-1.amazonaws.com/density-preview.png",
      alt: "Moldova Population Density 3D Visualization"
    },
    githubUrl: "https://github.com/worthybrae/country-density",
    sections: [
      {
        title: "Introduction",
        content: "This project creates visually striking 3D visualizations of population density across different countries. By combining geospatial data with advanced rendering techniques, we transform raw population statistics into intuitive and aesthetically pleasing 3D landscapes that make demographic patterns immediately visible and understandable.",
      },
      {
        title: "Project Overview",
        content: "The Country Density project uses R, geospatial libraries, and the Rayshader package to create high-quality 3D visualizations of population density data. These visualizations transform complex demographic statistics into intuitive, physical forms where height represents population concentration. The result is a visually appealing and scientifically accurate representation that makes geographic population patterns immediately apparent.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.us-east-1.amazonaws.com/ukraine.jpg",
          caption: "Population density visualization of Ukraine showing concentrations in major urban areas."
        }
      },
      {
        title: "Technical Implementation",
        content: "The system employs a sophisticated data processing pipeline that begins with raw population data and geographic boundaries. First, population data is mapped to geographic coordinates and normalized. Next, the data undergoes interpolation to create a continuous density surface. This surface is then rendered in 3D using Rayshader, with carefully designed color gradients that intuitively represent population density from sparse to highly concentrated areas.",
        codeSnippet: {
          title: "3D Rendering with Rayshader",
          language: "r",
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
        }
      },
      {
        title: "High-Quality Rendering",
        content: "The rendering process utilizes advanced raytracing techniques to create photorealistic visualizations. Multiple light sources are strategically positioned to highlight topographical features, with precise control over parameters like light direction, altitude, color, and intensity. Anti-aliasing and high sample counts ensure smooth, high-quality output. The rendering process is computationally intensive but produces stunning visual results that effectively communicate population distribution patterns.",
        codeSnippet: {
          title: "High-Quality Rendering Configuration",
          language: "r",
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
      },
      {
        title: "Visualization Gallery",
        content: "The project has successfully created visualizations for multiple countries, each revealing unique population distribution patterns. Moldova shows clear concentration in the capital region of Chișinău with sparse rural areas. Ukraine demonstrates several major population centers with notable concentration in the eastern regions and along the Dnieper River. Turkey displays coastal concentration patterns typical of Mediterranean countries, with dense populations along the Aegean and Mediterranean coasts and in major urban centers like Istanbul and Ankara.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.us-east-1.amazonaws.com/turkey.jpg",
          caption: "Population density visualization of Turkey showing coastal and urban concentrations."
        }
      },
      {
        title: "Future Directions",
        content: "The Country Density project is continually evolving, with several planned enhancements on the horizon. These include temporal visualizations that show population shifts over time, interactive web-based versions that allow users to explore the data in real-time, integration of additional demographic metrics such as age distribution and economic indicators, and higher-resolution renderings for select regions of particular interest. The flexible architecture of the system makes it well-suited for expansion to include these additional features."
      }
    ],
    relatedProjects: [
      {
        title: "AI Architecture",
        description: "A StyleGAN-based exploration of architectural design using machine learning.",
        link: "/projects/ai-architecture",
        image: "https://portfolio-worthy.s3.amazonaws.com/flesh_digression.mp4"
      },
      {
        title: "Livestream Art",
        description: "Real-time artistic transformation of the iconic Abbey Road crossing livestream using computer vision.",
        link: "/projects/livestream-art",
        image: "https://portfolio-worthy.s3.amazonaws.com/abbey-road-stream.mp4"
      }
    ]
  };

  return <MediumStyleProject {...projectData} />;
};

export default CountryDensity;