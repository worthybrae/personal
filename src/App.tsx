import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Coderview from '@/components/projects/Coderview';
import StreamClout from '@/components/projects/Streamclout';
import ArtPage from '@/pages/ArtPage';
import BlogPage from '@/pages/BlogPage';

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/coderview" element={<Coderview />} />
        <Route path="/projects/streamclout" element={<StreamClout />} />
        <Route path="/art/:slug" element={<ArtPage />} />
        <Route path="/blog/:slug" element={<BlogPage />} />
      </Routes>
    </Router>
  );
}

export default App;
