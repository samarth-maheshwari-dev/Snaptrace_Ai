import { BrowserRouter, Routes, Route, ScrollRestoration } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import PostItemPage from './pages/PostItemPage';
import SnapSearchPage from './pages/SnapSearchPage';
import ItemDetailPage from './pages/ItemDetailPage';
import AdminPage from './pages/AdminPage';

// Scroll recovery component to ensure scroll starts at top on transition
function ScrollToTop() {
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/post" element={<PostItemPage />} />
        <Route path="/snapsearch" element={<SnapSearchPage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Wildcard Fallback */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
