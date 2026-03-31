import { Link } from 'react-router-dom';
import { Zap, ExternalLink, Shield, BookOpen } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-glow" />
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="logo-icon-sm">
                <Zap size={16} />
              </div>
              <span className="footer-logo-text">Chain<span>Donate</span></span>
            </div>
            <p className="footer-desc">
              Prototype sistem donasi digital berbasis teknologi blockchain Ethereum 
              untuk memastikan transparansi dan akuntabilitas setiap transaksi.
            </p>
            <div className="footer-badges">
              <span className="badge badge-primary">Ethereum</span>
              <span className="badge badge-success">Solidity</span>
              <span className="badge badge-primary">Wagmi</span>
            </div>
          </div>

          {/* Menu */}
          <div className="footer-col">
            <h4 className="footer-col-title">Navigasi</h4>
            <nav className="footer-nav">
              <Link to="/">Beranda</Link>
              <Link to="/campaigns">Daftar Kampanye</Link>
              <Link to="/create">Buat Kampanye</Link>
              <Link to="/transparency">Transparansi</Link>
              <Link to="/register">Daftar Akun</Link>
            </nav>
          </div>

          {/* Tech Stack */}
          <div className="footer-col">
            <h4 className="footer-col-title">Teknologi</h4>
            <nav className="footer-nav">
              <a href="https://ethereum.org" target="_blank" rel="noreferrer">
                Ethereum Blockchain <ExternalLink size={11} />
              </a>
              <a href="https://soliditylang.org" target="_blank" rel="noreferrer">
                Solidity Smart Contract <ExternalLink size={11} />
              </a>
              <a href="https://ethers.org" target="_blank" rel="noreferrer">
                Ethers.js v6 <ExternalLink size={11} />
              </a>
              <a href="https://hardhat.org" target="_blank" rel="noreferrer">
                Hardhat Framework <ExternalLink size={11} />
              </a>
              <a href="https://metamask.io" target="_blank" rel="noreferrer">
                MetaMask Wallet <ExternalLink size={11} />
              </a>
            </nav>
          </div>

          {/* Info */}
          <div className="footer-col">
            <h4 className="footer-col-title">Tentang Penelitian</h4>
            <div className="footer-research">
              <div className="research-item">
                <Shield size={14} />
                <span>Prototype Sistem Donasi</span>
              </div>
              <div className="research-item">
                <BookOpen size={14} />
                <span>Berbasis Blockchain Ethereum</span>
              </div>
              <div className="research-item">
                <Zap size={14} />
                <span>Sepolia Testnet</span>
              </div>
            </div>
            <p className="footer-thesis">
              Skripsi — Implementasi Teknologi Blockchain pada Prototype Sistem Donasi Digital 
              Berbasis Web untuk Menjamin Transparansi Transaksi
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © 2026 ChainDonate — Penelitian Skripsi
          </p>
          <p className="footer-note">
            Menggunakan Jaringan Uji (Testnet) — Tidak Ada Uang Nyata Yang Digunakan
          </p>
        </div>
      </div>
    </footer>
  );
}
