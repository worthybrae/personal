import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from "./components/global/Header";
import AIArchitecture from "./components/projects/AIArchitecture";
import LivestreamArt from './components/projects/LivestreamArt';
import Landing from './components/pages/Landing';
import CountryDensity from './components/projects/CountryDensity';
import StreamClout from './components/projects/Streamclout';
import Coderview from './components/projects/Coderview';
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
          <Route path="/projects/country-density" element={<CountryDensity />} />
          <Route path="/projects/streamclout" element={<StreamClout />} />
          <Route path="/projects/coderview" element={<Coderview />} />
        </Routes>
        <Analytics />
      </div>
    </Router>
  );
}

export default App;