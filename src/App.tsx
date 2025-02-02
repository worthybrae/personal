import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from "./components/global/Header";
import AIArchitecture from "./components/projects/AIArchitecture";
import LivestreamArt from './components/projects/LivestreamArt';
import Landing from './components/pages/Landing';
import SpotifyStreams from './components/projects/SpotifyStreams';
import CountryDensity from './components/projects/CountryDensity';
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <Router basename="/">
      <div className="min-h-screen bg-background">
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/projects/ai-architecture" element={<AIArchitecture />} />
          <Route path="/projects/livestream-art" element={<LivestreamArt />} />
          <Route path="/projects/spotify-streams" element={<SpotifyStreams />} />
          <Route path="/projects/country-density" element={<CountryDensity />} />
        </Routes>
        <Analytics />
      </div>
    </Router>
  );
}

export default App;