import { Link } from 'react-router-dom';
import { Zap, Shield, BookOpen, Globe, ArrowUpRight } from 'lucide-react';
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
              <span className="footer-logo-text">Chain<span>Donate</span></span>
            </div>
            <p className="footer-desc">
              Prototype sistem donasi digital berbasis teknologi blockchain Ethereum
              untuk memastikan transparansi dan akuntabilitas setiap transaksi.
            </p>
            <div className="footer-badges">
              <span className="badge badge-primary">Ethereum</span>
              <span className="badge badge-success">Solidity</span>
              <span className="badge badge-primary">Sepolia</span>
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
            <nav className="footer-nav footer-nav-ext">
              <a href="https://ethereum.org" target="_blank" rel="noreferrer">
                <span>Ethereum</span>
                <ArrowUpRight size={13} className="ext-arrow" />
              </a>
              <a href="https://soliditylang.org" target="_blank" rel="noreferrer">
                <span>Solidity Smart Contract</span>
                <ArrowUpRight size={13} className="ext-arrow" />
              </a>
              <a href="https://viem.sh/" target="_blank" rel="noreferrer">
                <span>Viem</span>
                <ArrowUpRight size={13} className="ext-arrow" />
              </a>
              <a href="https://hardhat.org" target="_blank" rel="noreferrer">
                <span>Hardhat Framework</span>
                <ArrowUpRight size={13} className="ext-arrow" />
              </a>
              <a href="https://metamask.io" target="_blank" rel="noreferrer">
                <span>MetaMask Wallet</span>
                <ArrowUpRight size={13} className="ext-arrow" />
              </a>
            </nav>
          </div>

          {/* Info */}
          <div className="footer-col">
            <h4 className="footer-col-title">Tentang Penelitian</h4>
            <div className="footer-research">
              <div className="research-item">
                <span>Prototype Sistem Donasi</span>
              </div>
              <div className="research-item">
                <span>Berbasis Blockchain Ethereum</span>
              </div>
              <div className="research-item">
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
