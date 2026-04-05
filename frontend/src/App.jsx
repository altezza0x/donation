import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useEffect, Suspense, lazy } from 'react';

import { config } from './wagmi';
import { Web3Provider, useWeb3 } from './context/Web3Context';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Lazy loading pages untuk optimasi bundle size
const HomePage = lazy(() => import('./pages/HomePage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage'));
const CreateCampaignPage = lazy(() => import('./pages/CreateCampaignPage'));
const TransparencyPage = lazy(() => import('./pages/TransparencyPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
import './App.css';

// ======================================================
// Komponen redirect: jika wallet baru (belum terdaftar)
// langsung diarahkan ke halaman /register
// ======================================================
function GlobalRedirectHandler() {
  const { isConnected, isUserLoaded, user } = useWeb3();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Baru redirect jika:
    // 1. Wallet sudah terkoneksi
    // 2. Data user sudah selesai di-load dari blockchain
    // 3. User belum terdaftar (user === null)
    // 4. Bukan sedang di halaman register (hindari loop)
    // 5. Bukan di halaman publik (beranda, daftar kampanye, transparansi, detail kampanye)
    if (isConnected && isUserLoaded && !user) {
      const publicRoutes = ['/', '/campaigns', '/transparency', '/admin'];
      const isPublicRoute = publicRoutes.includes(location.pathname) || location.pathname.startsWith('/campaigns/');
      const isRegisterPage = location.pathname === '/register';

      if (!isPublicRoute && !isRegisterPage) {
        navigate('/register', { replace: true });
      }
    }
  }, [isConnected, isUserLoaded, user, location.pathname, navigate]);

  return null;
}

// ======================================================
// Komponen scroll to top: otomatis scroll ke atas tiap pindah halaman
// ======================================================
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#6366f1',
            accentColorForeground: '#f8fafc',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          locale="id"
          modalSize="compact"
        >
          <Web3Provider>
            <BrowserRouter>
              <ScrollToTop />
              <GlobalRedirectHandler />
              <div className="app-wrapper">
                <Navbar />
                <main className="main-content">
                  <Suspense fallback={
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, borderColor: 'var(--primary-500) transparent var(--primary-500) transparent' }} />
                    </div>
                  }>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/campaigns" element={<CampaignsPage />} />
                      <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                      <Route path="/create" element={<CreateCampaignPage />} />
                      <Route path="/transparency" element={<TransparencyPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/admin" element={<AdminPage />} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
              </div>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: '14px',
                  },
                  success: {
                    iconTheme: { primary: '#10b981', secondary: '#f8fafc' },
                  },
                  error: {
                    iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
                  },
                }}
              />
            </BrowserRouter>
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
