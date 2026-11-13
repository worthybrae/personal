import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Home from '@/pages/Home';
import BlogPage from '@/pages/BlogPage';

/** /work/:slug moved to /code/:slug. The server redirects too; this covers dev. */
function LegacyWorkRedirect() {
  const { slug = '' } = useParams();
  return <Navigate to={`/code/${slug}`} replace />;
}

function App() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/blog/:slug" element={<BlogPage />} />
        <Route path="/feed" element={<Navigate to="/code" replace />} />
        <Route path="/work/:slug" element={<LegacyWorkRedirect />} />
        <Route path="/*" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
