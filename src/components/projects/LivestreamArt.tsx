// src/components/projects/LivestreamArt.tsx
import MediumStyleProject from '../global/PageTemplate';

const LivestreamArt = () => {
  const projectData = {
    title: "Livestream Art",
    subtitle: "Real-time artistic transformation of the iconic Abbey Road crossing livestream using computer vision and edge detection.",
    heroMedia: {
      type: 'video' as const,
      src: "https://portfolio-worthy.s3.amazonaws.com/abbey_road_best.mp4",
    },
    githubUrl: "https://github.com/worthybrae/livestream-morphing",
    sections: [
      {
        title: "Introduction",
        content: "The Livestream Art project transforms the iconic Abbey Road crossing livestream into an artistic visualization using real-time computer vision techniques. By applying edge detection algorithms to the live feed, the project creates a dynamic, artistic interpretation of one of the world's most famous pedestrian crossings, blending technology and art in a continuous, ever-changing digital canvas.",
      },
      {
        title: "Technical Overview",
        content: "This project processes the Abbey Road livestream in real-time, applying computer vision techniques to create an artistic edge-detection visualization. The system includes real-time video stream processing, OpenCV-based edge detection, dynamic contrast adjustment based on time of day, and automated timestamp and location overlay. The resulting output creates an artistic representation that highlights the movement and forms of pedestrians and vehicles while abstracting away unnecessary details.",
        media: {
          type: 'video' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/abbey-road-stream.mp4",
          caption: "Real-time edge detection applied to the Abbey Road crossing livestream."
        }
      },
      {
        title: "System Architecture",
        content: "The system utilizes a distributed architecture with multiple components working in harmony to process the livestream in real-time. The architecture includes a stream capture service that pulls the HLS feed from the source, a processing pipeline that applies the computer vision algorithms, and a distribution system that makes the processed feed available for viewing. This modular approach allows for scaling individual components based on processing demands and viewer traffic.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/architecture.png",
          caption: "System architecture diagram showing the complete processing pipeline from source to viewer."
        }
      },
      {
        title: "Implementation Details",
        content: "The processing pipeline follows a carefully designed sequence of operations to achieve the desired artistic effect. First, frames are extracted from the HLS stream at a rate of 30 frames per second. These frames undergo Gaussian blur for noise reduction, followed by Canny edge detection with adaptive thresholds that respond to the overall brightness and contrast of the scene. Morphological operations are then applied to smooth the detected edges, resulting in cleaner lines. Finally, a dynamic text overlay adds contextual information including time and location.",
        codeSnippet: {
          title: "Edge Detection Pipeline",
          language: "python",
          code: `def process_frame(frame):
    # Convert to grayscale for edge detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Detect edges using Canny algorithm with adaptive thresholds
    median_val = np.median(blurred)
    lower = int(max(0, (1.0 - 0.33) * median_val))
    upper = int(min(255, (1.0 + 0.33) * median_val))
    edges = cv2.Canny(blurred, lower, upper)
    
    # Apply morphological operations to clean up edges
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.erode(edges, kernel, iterations=1)
    
    # Create the output image with white lines on black background
    result = np.zeros_like(frame)
    result[edges != 0] = [255, 255, 255]
    
    # Add timestamp and location overlay
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(result, f"Abbey Road, London | {timestamp}", 
                (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 
                0.7, (200, 200, 200), 2)
    
    return result`
        }
      },
      {
        title: "Backend Processing",
        content: "The backend processing system relies on a Celery task queue to manage the computational workload. This approach allows for distributed processing across multiple worker nodes, ensuring that the system can handle the continuous stream of video frames without building up latency. The Celery backend also provides monitoring capabilities, allowing for real-time observation of worker performance, task throughput, and error rates, which helps maintain system reliability and performance.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/celery.png",
          caption: "Visualization of the Celery task queue system showing real-time processing statistics and worker status."
        }
      },
      {
        title: "Performance Metrics",
        content: "The system maintains impressive performance metrics despite the computational intensity of real-time video processing. Operating at 30 frames per second on a Full HD (1920x1080) stream, the system achieves an average processing latency of just 200ms per frame. Edge detection operations are particularly optimized, consuming only 33ms per frame. These performance characteristics ensure that viewers experience a smooth, responsive artistic visualization that feels connected to the live events happening at the Abbey Road crossing.",
      },
      {
        title: "Future Enhancements",
        content: "Looking ahead, several enhancements are planned for the Livestream Art project. Machine learning-based object detection could enable more intelligent processing that distinguishes between pedestrians, vehicles, and other elements in the scene. Additional artistic style variations would provide viewers with different visualization options. Interactive controls could allow viewers to adjust visual parameters in real-time. Finally, a historical footage archiving system would enable playback of interesting moments, creating a searchable archive of artistic interpretations of this culturally significant location."
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
        title: "AI Architecture",
        description: "A StyleGAN-based exploration of architectural design using machine learning.",
        link: "/projects/ai-architecture",
        image: "https://portfolio-worthy.s3.amazonaws.com/flesh_digression.mp4"
      },
      {
        title: "Country Density",
        description: "A data visualization project that transforms population density data into stunning 3D renderings using R and the Rayshader library.",
        link: "/projects/country-density",
        image: "https://portfolio-worthy.s3.us-east-1.amazonaws.com/density-preview.png"
      },
      {
        title: "coderview",
        description: "An AI-powered platform for technical career development, offering resume analysis, GitHub portfolio review, and automated cover letter generation.",
        link: "/projects/coderview",
        image: "https://portfolio-worthy.s3.amazonaws.com/coderview-demo.mp4"
      }
    ]
  };

  return <MediumStyleProject {...projectData} />;
};

export default LivestreamArt;