import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConnectModal, useAccountModal, useChainModal } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../context/Web3Context';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useSafeConnect } from '../hooks/useSafeConnect';
import { chain as activeChain } from '../wagmi';
import logoImg from '../assets/logo.png';
import {
  User, Menu, X,
  Wallet, AlertTriangle, Radio
} from 'lucide-react';
import './Navbar.css';

const navLinks = [
  { to: '/', label: 'Beranda' },
  { to: '/campaigns', label: 'Kampanye' },
  { to: '/create', label: 'Buat Kampanye' },
  { to: '/transparency', label: 'Transparansi' },
  { to: '/faucet', label: 'Faucet' },
];

function NavLinks({ location, isContractOwner }) {
  const allLinks = isContractOwner
    ? [...navLinks, { to: '/admin', label: 'Admin' }]
    : navLinks;

  const getIsActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  return (
    <div className="navbar-links">
      {allLinks.map(({ to, label }) => {
        const isActive = getIsActive(to);
        return (
          <Link
            key={to}
            to={to}
            className={`nav-link ${isActive ? 'active' : ''}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const { user, isConnected, isContractOwner } = useWeb3();
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { openSafeConnectModal } = useSafeConnect();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Data chain dari wagmi langsung
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongNetwork = isConnected && chainId !== activeChain.id;
  const chainName = isWrongNetwork ? 'Jaringan Salah' : activeChain.name;

  // Auto-switch ke Sepolia jika jaringan salah saat wallet terhubung
  useEffect(() => {
    if (isWrongNetwork && switchChain) {
      switchChain({ chainId: activeChain.id });
    }
  }, [isWrongNetwork, switchChain]);

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
          <span className="logo-text logo-text-desktop">
            Chain<span className="logo-accent">Donate</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <NavLinks location={location} isContractOwner={isContractOwner} />

        {/* Right Side */}
        <div className="navbar-actions">
          {/* Desktop Wallet Group */}
          <div className="desktop-wallet-group">
            {/* Chain button - hanya saat terhubung */}
            {isConnected && (
              <button
                onClick={openChainModal}
                type="button"
                className={`chain-btn ${isWrongNetwork ? 'chain-btn-error' : 'chain-btn-ok'}`}
                title="Ganti jaringan"
              >
                {isWrongNetwork ? (
                  <AlertTriangle size={13} />
                ) : (
                  <img src={activeChain.iconUrl || 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'} alt="Chain Icon" className="chain-icon-img" />
                )}
                <span className="chain-btn-label">{chainName}</span>
              </button>
            )}

            {/* Wallet button */}
            {!isConnected ? (
              <button
                onClick={openSafeConnectModal}
                type="button"
                className="connect-wallet-btn"
              >
                <Wallet size={15} />
                Hubungkan Wallet
              </button>
            ) : (
              <div className="wallet-dropdown-wrapper">
                <button
                  className="wallet-connected-btn"
                  onClick={openAccountModal}
                  type="button"
                >
                  <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}</span>
                </button>
              </div>
            )}
          </div>

          {/* Profile link if connected */}
          {isConnected && (
            <Link to="/profile" className="nav-profile-btn" title="Profil Saya">
              <User size={16} />
            </Link>
          )}

          {/* Mobile Wallet Button */}
          {!isConnected ? (
            <button
              onClick={openSafeConnectModal}
              type="button"
              className="mobile-wallet-header-btn"
            >
              <Wallet size={15} />
              <span className="mobile-wallet-header-label">Hubungkan Wallet</span>
            </button>
          ) : (
            <div className="mobile-connected-group">
              <button
                onClick={openChainModal}
                type="button"
                className={`mobile-chain-btn ${isWrongNetwork ? 'mobile-chain-btn-error' : ''}`}
                title={isWrongNetwork ? 'Jaringan Salah' : chainName}
              >
                {isWrongNetwork ? (
                  <AlertTriangle size={14} />
                ) : (
                  <img src={activeChain.iconUrl || 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'} alt="Chain Icon" className="chain-icon-img" style={{ width: 14, height: 14 }} />
                )}
              </button>
              <button
                onClick={openAccountModal}
                type="button"
                className="mobile-wallet-header-btn connected-compact"
              >
                <span className="mobile-wallet-header-label">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                </span>
              </button>
            </div>
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
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`mobile-nav-link ${location.pathname === to ? 'active' : ''}`}
            >
              {label}
            </Link>
          ))}
          {isContractOwner && (
            <Link
              to="/admin"
              className={`mobile-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              Admin
            </Link>
          )}

          {/* Profile link di mobile menu jika sudah connect */}
          {isConnected && (
            <Link to="/profile" className="mobile-profile-link" onClick={() => setMobileOpen(false)}>
              <User size={16} />
              Profil Saya
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
