import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import AppsPage from '@/pages/AppsPage';
import ArtListPage from '@/pages/ArtListPage';
import BlogListPage from '@/pages/BlogListPage';
import BlogPage from '@/pages/BlogPage';

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/art" element={<ArtListPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPage />} />
      </Routes>
    </Router>
  );
}

export default App;
