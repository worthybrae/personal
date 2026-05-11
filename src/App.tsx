import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import BlogPage from '@/pages/BlogPage';

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Home />} />
        <Route path="/work/:slug" element={<Home />} />
        <Route path="/art/:slug" element={<Home />} />
        <Route path="/blog/:slug" element={<BlogPage />} />
      </Routes>
    </Router>
  );
}

export default App;
