// src/components/projects/StreamClout.tsx
import MediumStyleProject from '../global/PageTemplate';

const StreamClout = () => {
  const projectData = {
    title: "streamclout.io",
    subtitle: "A real-time analytics platform tracking and visualizing Spotify streaming data, artist performance, and music trends using unofficial APIs and distributed task processing.",
    heroMedia: {
      type: 'video' as const,
      src: "https://portfolio-worthy.s3.amazonaws.com/streamclout-demo.mp4",
    },
    githubUrl: "https://github.com/worthybrae/streamclout",
    visitSiteUrl: "https://streamclout.io",
    sections: [
      {
        title: "Introduction",
        content: "streamclout.io brings transparency to music industry streaming metrics by accessing Spotify's internal APIs to track real-time streaming data. By reverse-engineering Spotify's own data endpoints, the platform provides artists, labels, and music enthusiasts with accurate insights into streaming performance that aren't available through official channels. The system continuously monitors play counts across thousands of tracks, enabling trend analysis, artist comparisons, and identification of viral growth patterns.",
      },
      {
        title: "Interactive Demo",
        content: "Below is an interactive demo of the StreamClout platform. This walkthrough showcases the real-time tracking capabilities, artist analytics dashboard, and trending tracks features of the application. The demo highlights how users can explore detailed streaming metrics, compare artist performance, and identify growth patterns across different time periods.",
        media: {
          type: 'custom' as const,
          component: () => (
            <div style={{ position: 'relative', boxSizing: 'content-box', width: '100%', aspectRatio: '1.8864628820960698', padding: '20px 0' }}>
              <iframe 
                src="https://app.supademo.com/embed/cm8rddedc0h05lythy3y0fzlv?embed_v=2" 
                loading="lazy" 
                title="Streamclout Demo" 
                allow="clipboard-write" 
                allowFullScreen 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            </div>
          )
        }
      },
      {
        title: "The Technical Challenge",
        content: "The project required solving several significant technical challenges. First, I needed to reverse-engineer Spotify's internal API endpoints that contain streaming data not accessible through their public API. Second, the system had to handle authentication through browser emulation to obtain the necessary tokens. Finally, I needed to design a scalable architecture capable of continuously processing thousands of albums and tracks without exceeding rate limits or encountering stability issues.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/celery-process.png",
          caption: "High-level architecture diagram of the StreamClout data processing pipeline."
        }
      },
      {
        title: "Reverse Engineering Spotify's Internal API",
        content: "To access streaming data not available through Spotify's public API, I used browser debugging tools to identify internal GraphQL endpoints used by Spotify's web player. After mapping the authentication flow and request patterns, I discovered that album and track play count data was accessible through a specific partner endpoint. The system now utilizes Playwright for headless browser automation to capture authentication tokens and maintain access to these internal APIs while respecting rate limits and implementing exponential backoff strategies to ensure reliable data collection.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/request-flow.png",
          caption: "Authentication flow diagram showing how tokens are intercepted from the Spotify web player."
        },
        codeSnippet: {
          title: "Token Acquisition via Browser Automation",
          language: "python",
          code: `async def _fetch_tokens_with_playwright(self) -> Tuple[str, str]:
    """
    Fetch both bearer and client tokens using Playwright to intercept network requests
    
    Returns:
        Tuple of (bearer_token, client_token)
    """
    # Storage for our tokens
    tokens = {"bearer": None, "client": None}
    tokens_found = asyncio.Event()
    
    async with async_playwright() as p:
        # Launch the browser in headless mode
        browser = await p.chromium.launch(headless=True)
        
        try:
            context = await browser.new_context()
            page = await context.new_page()
            
            # Set up our request interceptor
            async def capture_tokens(request):
                # Only look at requests to the Spotify API
                if "api-partner.spotify.com/pathfinder/v1/query" in request.url:
                    headers = request.headers
                    
                    # Extract tokens from headers
                    if "authorization" in headers and headers["authorization"].startswith("Bearer "):
                        tokens["bearer"] = headers["authorization"].replace("Bearer ", "")
                    
                    if "client-token" in headers:
                        tokens["client"] = headers["client-token"]
                    
                    # If we found both tokens, signal that we're done
                    if tokens["bearer"] and tokens["client"]:
                        tokens_found.set()
            
            # Register the interceptor
            page.on("request", capture_tokens)
            
            # Navigate to Spotify
            await page.goto("https://open.spotify.com/")`
        }
      },
      {
        title: "Distributed Data Processing Pipeline",
        content: "The heart of StreamClout is a distributed task processing system built with Celery, which manages the continuous collection and analysis of streaming data. The pipeline works in three stages: first, a batch of albums is retrieved from the database; second, each album's track data is fetched from Spotify's API; finally, the streaming metrics are stored and analyzed for trends. This architecture allows for horizontal scaling across multiple worker nodes, automatic retry mechanisms for failed requests, and rate limiting to avoid API bans.",
        media: {
          type: 'image' as const,
          src: "https://portfolio-worthy.s3.amazonaws.com/streamclout-celery-monitor.png",
          caption: "Celery Flower dashboard showing real-time monitoring of the worker cluster and task processing statistics."
        },
        codeSnippet: {
          title: "Task Chaining for Album Processing",
          language: "python",
          code: `@app.task
def fetch_albums_batch():
    """Fetch a batch of albums from database and distribute work"""
    return asyncio.run(_fetch_albums_batch_async())

async def _fetch_albums_batch_async():
    """Async implementation of the album batch fetching"""
    # Get next batch parameters from the singleton tracker
    batch_params = await album_tracker.get_next_batch()
    
    # Get database service from singleton
    db_service = db_singleton.get_service()
    albums = await db_service.get_all_albums(
        limit=batch_params["limit"],
        offset=batch_params["offset"]
    )
    
    # If no albums found, reset tracker and return
    if not albums:
        print('No more albums to process, resetting tracker')
        album_tracker.reset()
        return {"status": "complete", "message": "No more albums to process"}
    
    # For each album, create a task to fetch metrics
    for album in albums:
        fetch_album_metrics.delay(album)
    
    # Add this to chain the next batch automatically
    # This is the key fix - schedule the next batch processing
    fetch_albums_batch.delay()
    
    return {
        "status": "processing",
        "batch": batch_params,
        "albums_count": len(albums)
    }`
        }
      },
      {
        title: "Dynamic Data Visualization",
        content: "The frontend user experience focuses on interactive data visualization, with custom React components that adapt to the streaming data patterns. Artists and album pages feature color schemes dynamically extracted from cover art, creating a unique visual identity for each page. The visualization system includes interactive trend charts that allow users to compare artists, albums, and tracks over customizable time periods. A particularly innovative feature is the 'Stream Velocity' metric, which identifies tracks experiencing unusual growth patterns that might indicate viral potential.",
        codeSnippet: {
          title: "Dynamic Color Extraction from Album Art",
          language: "typescript",
          code: `useEffect(() => {
  if (!imageUrl) {
    setColors([]);
    return;
  }

  const extractColors = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create an image element to load the cover art
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setError('Canvas context not available');
          setLoading(false);
          return;
        }
        
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Sample points from different areas of the image
        const samplePoints = [
          // Corners, center, and additional sampling points
          { x: 0, y: 0 }, // top-left
          { x: img.width - 1, y: 0 }, // top-right
          { x: 0, y: img.height - 1 }, // bottom-left
          { x: img.width - 1, y: img.height - 1 }, // bottom-right
          // ...more sampling points
        ];
        
        // Extract raw colors from sample points
        const rawColors = samplePoints.map(point => {
          const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
          return { r: pixel[0], g: pixel[1], b: pixel[2] };
        });
        
        // Calculate color distance to find the most distinctive colors
        const distinctColors = [];
        
        // Function to calculate color distance
        const colorDistance = (c1, c2) => {
          return Math.sqrt(
            Math.pow(c2.r - c1.r, 2) + 
            Math.pow(c2.g - c1.g, 2) + 
            Math.pow(c2.b - c1.b, 2)
          );
        };`
        }
      },
      {
        title: "API and Integration",
        content: "StreamClout offers a public API that allows third-party applications to access streaming data with proper authentication. The API includes endpoints for searching artists and albums, retrieving current and historical streaming metrics, and analyzing trends. This enables music industry professionals to integrate StreamClout data into their own workflows and tools. The API implementation includes rate limiting, detailed documentation, and API key management for secure access control.",
        codeSnippet: {
          title: "Album Search API Endpoint",
          language: "python",
          code: `@router.get("/albums")
async def search_albums(
    query: str = Query(..., min_length=1),
    limit: int = Query(default=10, le=50),
    force_spotify: bool = Query(False, description="Force search on Spotify even if results found in database"),
    _: str = Depends(verify_api_key)
):
    """
    Search albums by name in database. If no results or force_spotify=True, search Spotify API.
    """
    try:
        # Get services
        db_service = get_database_service()
        spotify_services = get_spotify_services()
        official_spotify = spotify_services["official"]
        
        # If not forcing Spotify, try database first
        if not force_spotify:
            # First search in database
            db_results = await db_service.search_albums_by_name(query, limit)
            
            # If we have results, return them
            if db_results and len(db_results) > 0:
                return db_results
        
        # If we're forcing Spotify search or nothing was found in the database, search Spotify
        try:
            spotify_results = await official_spotify.search_albums(query, limit)
            
            # Convert to same format as db results
            return [
                {
                    "album_id": album.album_id,
                    "album_name": album.album_name,
                    "artist_name": album.artist_name,
                    "artist_id": album.artist_id,
                    "cover_art": album.cover_art,
                    "release_date": album.release_date
                } for album in spotify_results
            ]
        except Exception as e:
            err_trace = traceback.format_exc()
            print(f"Error searching Spotify API: {err_trace}")
            raise HTTPException(status_code=500, detail=f"Failed to search Spotify API: {str(e)}")
    
    except Exception as e:
        err_trace = traceback.format_exc()
        print(f"Error searching albums: {err_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to search albums: {str(e)}")`
        }
      },
      {
        title: "Impact and Future Development",
        content: "StreamClout has already processed millions of data points across thousands of artists, providing unprecedented transparency in music streaming metrics. Future development plans include expanding to additional streaming platforms, implementing machine learning for predictive analytics, and creating artist alert systems that notify users of significant streaming milestone achievements. The modular architecture of the system makes it well-positioned for these enhancements, with the potential to become a comprehensive music industry analytics platform that serves artists, labels, and fans alike."
      }
    ],
    relatedProjects: [
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

export default StreamClout;