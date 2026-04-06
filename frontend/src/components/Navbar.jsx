import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../context/Web3Context';
import logoImg from '../assets/logo.png';
import {
  Home, LayoutGrid, PlusCircle, BarChart3, User, Menu, X,
  Wallet, LogOut, ChevronDown, Zap, Shield
} from 'lucide-react';
import './Navbar.css';

const navLinks = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/campaigns', label: 'Kampanye', icon: LayoutGrid },
  { to: '/create', label: 'Buat Kampanye', icon: PlusCircle },
  { to: '/transparency', label: 'Transparansi', icon: BarChart3 },
  { to: '/faucet', label: 'Faucet', icon: Zap },
];

export default function Navbar() {
  const location = useLocation();
  const { user, isConnected, isContractOwner } = useWeb3();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <img src={logoImg} alt="ChainDonate Logo" className="custom-logo-img" />
          <span className="logo-text">
            Chain<span className="logo-accent">Donate</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${location.pathname === to ? 'active' : ''}`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
          {isContractOwner && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              <Shield size={15} />
              Admin
            </Link>
          )}
        </div>

        {/* Right Side — RainbowKit ConnectButton */}
        <div className="navbar-actions">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus || authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="connect-wallet-btn"
                        >
                          <Wallet size={15} />
                          Hubungkan Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="connect-wallet-btn wrong-network"
                        >
                          Jaringan Salah
                        </button>
                      );
                    }

                    return (
                      <div className="wallet-dropdown-wrapper">
                        <button
                          className="wallet-connected-btn"
                          onClick={openAccountModal}
                          type="button"
                        >
                          <div className="wallet-dot" />
                          <span>{account.displayName}</span>
                          {user && <span className="wallet-name">{user.name}</span>}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>

          {/* Profile link if connected */}
          {isConnected && (
            <Link to="/profile" className="nav-profile-btn" title="Profil Saya">
              <User size={16} />
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`mobile-nav-link ${location.pathname === to ? 'active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          {isContractOwner && (
            <Link
              to="/admin"
              className={`mobile-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              <Shield size={16} />
              Admin
            </Link>
          )}

          {/* Wallet section di mobile menu */}
          <div className="mobile-wallet-section">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain &&
                  (!authenticationStatus || authenticationStatus === 'authenticated');

                if (!ready) return null;
                if (!connected) {
                  return (
                    <button onClick={openConnectModal} type="button" className="mobile-connect-wallet-btn">
                      <Wallet size={18} />
                      Hubungkan Wallet
                    </button>
                  );
                }
                if (chain.unsupported) {
                  return (
                    <button onClick={openChainModal} type="button" className="mobile-wrong-network">
                      ⚠️ Jaringan Salah — Klik untuk ganti
                    </button>
                  );
                }
                return (
                  <>
                    <button onClick={openAccountModal} type="button" className="mobile-wallet-connected">
                      <div className="wallet-dot" />
                      <span>{account.displayName}</span>
                      {user && <span className="mobile-wallet-badge">{user.name}</span>}
                    </button>
                    {isConnected && (
                      <Link to="/profile" className="mobile-profile-link" onClick={() => setMobileOpen(false)}>
                        <User size={16} />
                        Profil Saya
                      </Link>
                    )}
                  </>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      )}
    </nav>
  );
}
