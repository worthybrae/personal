// src/components/global/Header.tsx
import { Link, useLocation } from 'react-router-dom';
import ContactForm from './ContactForm';

const Header = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';


  return (
    <>
      {/* Spacer only for non-landing pages */}
      {!isLandingPage && <div className="h-16" />}
      
      <header className={`fixed top-0 left-0 right-0 z-50 ${
        isLandingPage 
          ? 'bg-black/40 backdrop-blur-sm border-b border-white/10' 
          : 'bg-white/80 backdrop-blur-sm border-b border-gray-200'
      }`}>
        <div className="container mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-8">
            <Link 
              to="/" 
              className={`text-xl font-bold transition-colors ${
                isLandingPage ? 'text-white hover:text-white/90' : 'text-black hover:text-gray-800'
              }`}
            >
              <img src='logo.png' width={45}/>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link 
                to="/projects/ai-architecture" 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isLandingPage 
                    ? 'text-white/90 hover:text-white hover:bg-white/10' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                AI Architecture
              </Link>
              <Link 
                to="/projects/livestream-art" 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isLandingPage 
                    ? 'text-white/90 hover:text-white hover:bg-white/10' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Livestream Art
              </Link>
              <Link 
                to="/projects/spotify-streams" 
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isLandingPage 
                    ? 'text-white/90 hover:text-white hover:bg-white/10' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Spotify Streams
              </Link>
            </nav>
          </div>

          <div className="ml-auto">
            
            <ContactForm></ContactForm>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;