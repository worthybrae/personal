// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from "./components/global/Header";
import AIArchitecture from "./components/projects/AIArchitecture";
import LivestreamArt from './components/projects/LivestreamArt';
import Landing from './components/pages/Landing';
import SpotifyStreams from './components/projects/SpotifyStreams';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/projects/ai-architecture" element={<AIArchitecture />} />
          <Route path="/projects/livestream-art" element={<LivestreamArt />} />
          <Route path="/projects/spotify-streams" element={<SpotifyStreams />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
