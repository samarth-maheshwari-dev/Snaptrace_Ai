import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './lib/auth';
import MyActivityPage from './pages/MyActivityPage';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import PostItemPage from './pages/PostItemPage';
import SnapSearchPage from './pages/SnapSearchPage';
import ItemDetailPage from './pages/ItemDetailPage';
// Admin pulls in recharts; most visitors never open it.
const AdminPage = lazy(() => import('./pages/AdminPage'));

function NotFound() {
  return (
    <div className="container-page py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-5xl">Nothing here.</h1>
      <p className="mt-3 text-muted">Ironically, this page is lost.</p>
      <Link to="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="report" element={<PostItemPage />} />
            <Route path="search" element={<SnapSearchPage />} />
            <Route path="me" element={<MyActivityPage />} />
            <Route path="item/:id" element={<ItemDetailPage />} />
            <Route path="admin" element={<Suspense fallback={<div className="container-page py-24 text-muted">Loading…</div>}><AdminPage /></Suspense>} />
            {/* old URLs */}
            <Route path="post" element={<Navigate to="/report" replace />} />
            <Route path="snapsearch" element={<Navigate to="/search" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
