import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useEffect } from 'react';

import { config } from './wagmi';
import { Web3Provider, useWeb3 } from './context/Web3Context';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import TransparencyPage from './pages/TransparencyPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
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
      const publicRoutes = ['/', '/campaigns', '/transparency'];
      const isPublicRoute = publicRoutes.includes(location.pathname) || location.pathname.startsWith('/campaigns/');
      const isRegisterPage = location.pathname === '/register';

      if (!isPublicRoute && !isRegisterPage) {
        navigate('/register', { replace: true });
      }
    }
  }, [isConnected, isUserLoaded, user, location.pathname, navigate]);

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
              <GlobalRedirectHandler />
              <div className="app-wrapper">
                <Navbar />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/campaigns" element={<CampaignsPage />} />
                    <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                    <Route path="/create" element={<CreateCampaignPage />} />
                    <Route path="/transparency" element={<TransparencyPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/register" element={<RegisterPage />} />
                  </Routes>
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
