import { lazy, StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import './reset.css';
import { GraphicPortfolio } from './pages/GraphicPortfolio';

const Admin = lazy(() => import('./pages/Admin'));

function NavigationEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pathname === '/admin' ? 'Studio Sora · Admin' : 'Sora Anindya · Desain grafis';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <NavigationEffects />
      <Suspense fallback={<p className="resource-state" role="status">Memuat studio…</p>}>
        <Routes>
          <Route path="/" element={<GraphicPortfolio />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<main className="resource-state"><h1>Halaman tidak ditemukan</h1><Link to="/">Kembali ke portofolio</Link></main>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
