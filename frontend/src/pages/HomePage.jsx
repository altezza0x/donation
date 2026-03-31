import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { formatEther } from 'viem';
import CampaignCard from '../components/CampaignCard';
import {
  Shield, Zap, TrendingUp, Users, Heart, ArrowRight,
  ChevronRight, Lock, Eye, CheckCircle, Globe, Star,
  Activity, Clock, Wallet, BarChart2, Hash, ArrowUpRight
} from 'lucide-react';
import './HomePage.css';

const FEATURES = [
  {
    icon: Shield,
    title: 'Transparan 100%',
    desc: 'Setiap transaksi tercatat permanen di blockchain Ethereum. Tidak ada yang bisa disembunyikan atau dimanipulasi.',
    color: 'primary',
  },
  {
    icon: Zap,
    title: 'Smart Contract',
    desc: 'Dana dikelola otomatis oleh smart contract Solidity. Tidak ada perantara yang menyentuh uang Anda.',
    color: 'accent',
  },
  {
    icon: Eye,
    title: 'Lacak Real-time',
    desc: 'Pantau alur dana Anda secara real-time. Dari dompet Anda hingga tangan penerima.',
    color: 'success',
  },
  {
    icon: Lock,
    title: 'Immutable & Aman',
    desc: 'Transaksi blockchain tidak dapat diubah atau dihapus. Catatan donasi Anda abadi selamanya.',
    color: 'warning',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Hubungkan Wallet', desc: 'Sambungkan MetaMask ke platform ChainDonate' },
  { step: '02', title: 'Daftar Akun', desc: 'Registrasi sebagai donatur atau penerima donasi' },
  { step: '03', title: 'Pilih Kampanye', desc: 'Temukan kampanye yang ingin Anda dukung' },
  { step: '04', title: 'Donasi & Verifikasi', desc: 'Kirim donasi — smart contract otomatis mencatat di blockchain' },
];

function timeAgo(timestampSeconds) {
  const diff = Math.floor(Date.now() / 1000) - Number(timestampSeconds);
  if (diff < 60) return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

export default function HomePage() {
  const { contract, isConnected } = useWeb3();
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const feedRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!contract) { setLoading(false); return; }
      try {
        const [platformStats, allCamps, donations] = await Promise.all([
          contract.getPlatformStats(),
          contract.getAllCampaigns(),
          contract.getAllDonations(),
        ]);

        setStats({
          totalCampaigns: Number(platformStats[0]),
          totalDonations: Number(platformStats[1]),
          totalFundsRaised: parseFloat(formatEther(platformStats[2])).toFixed(4),
          activeCampaigns: Number(platformStats[3]),
        });

        setAllCampaigns(allCamps);

        // Top campaigns by raised amount
        const sorted = [...allCamps].sort((a, b) => Number(b.raisedAmount) - Number(a.raisedAmount));
        setCampaigns(sorted.slice(0, 6));

        // Recent donations — reverse for newest first, take top 8
        const recent = [...donations].reverse().slice(0, 8);
        setRecentDonations(recent);
        setLiveCount(donations.length);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contract]);

  // Scroll feed slowly on hover off
  useEffect(() => {
    if (!feedRef.current || recentDonations.length === 0) return;
    let frame;
    const el = feedRef.current;
    let speed = 0.4;
    let paused = false;
    const tick = () => {
      if (!paused) {
        el.scrollTop += speed;
        if (el.scrollTop >= el.scrollHeight - el.clientHeight) el.scrollTop = 0;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    el.addEventListener('mouseenter', () => { paused = true; });
    el.addEventListener('mouseleave', () => { paused = false; });
    return () => cancelAnimationFrame(frame);
  }, [recentDonations]);

  const getCampaignTitle = (id) => {
    const c = allCampaigns.find(c => c.id.toString() === id.toString());
    return c ? c.title : `Kampanye #${id}`;
  };

  return (
    <div className="home-page">
      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />
        <div className="hero-bg-orb orb-3" />
        <div className="hero-grid-pattern" />

        <div className="container hero-container">
          {/* Left — Copy */}
          <div className="hero-content">
            <div className="hero-tag animate-fade-in">
              <div className="hero-tag-dot" />
              Berbasis Teknologi Blockchain Ethereum
            </div>

            <h1 className="hero-title animate-fade-in">
              Donasi Digital yang{' '}
              <span className="gradient-text">Transparan</span>{' '}
              &amp; <span className="gradient-text">Terpercaya</span>
            </h1>

            <p className="hero-desc animate-fade-in">
              Platform donasi berbasis{' '}
              <strong className="highlight-text">blockchain Ethereum</strong> dengan{' '}
              <strong className="highlight-text">smart contract Solidity</strong>{' '}
              — setiap donasi tercatat abadi, transparan, dan dapat dilacak siapa pun.
            </p>

            <div className="hero-actions animate-fade-in">
              <Link to="/campaigns" className="btn-hero-primary">
                <Heart size={18} />
                Mulai Donasi
                <ArrowRight size={16} />
              </Link>
              <Link to="/transparency" className="btn-hero-secondary">
                <Eye size={18} />
                Lihat Transparansi
              </Link>
            </div>

            {/* Mini stats row */}
            <div className="hero-mini-stats animate-fade-in">
              {[
                { label: 'Kampanye Aktif', value: stats ? stats.activeCampaigns : '—' },
                { label: 'Total Donasi', value: stats ? stats.totalDonations : '—' },
                { label: 'ETH Terkumpul', value: stats ? stats.totalFundsRaised : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="mini-stat">
                  <span className="mini-stat-value">{value}</span>
                  <span className="mini-stat-label">{label}</span>
                </div>
              ))}
            </div>

            {!isConnected && (
              <div className="hero-wallet-notice">
                <Zap size={14} />
                Hubungkan MetaMask Anda untuk mulai berdonasi
              </div>
            )}
          </div>

          {/* Right — Live Dashboard */}
          <div className="hero-dashboard animate-fade-in">
            {/* Header bar */}
            <div className="hdash-header">
              <div className="hdash-live-dot" />
              <span className="hdash-live-label">Live Blockchain Feed</span>
              <div className="hdash-network">
                <div className="hdash-net-dot" />
                Hardhat Network
              </div>
            </div>

            {/* 4-stat grid */}
            <div className="hdash-stats-grid">
              {[
                { label: 'Kampanye', value: stats?.totalCampaigns ?? '—', color: '#818cf8' },
                { label: 'Transaksi', value: stats?.totalDonations ?? '—', color: '#34d399' },
                { label: 'ETH Raised', value: stats ? `${stats.totalFundsRaised}` : '—', color: '#22d3ee' },
                { label: 'Aktif', value: stats?.activeCampaigns ?? '—', color: '#fbbf24' },
              ].map(({ label, value, color }) => (
                <div key={label} className="hdash-stat" style={{ '--hc': color }}>
                  <div className="hdash-stat-value" style={{ color }}>{value}</div>
                  <div className="hdash-stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Live Donation Feed */}
            <div className="hdash-feed-wrap">
              <div className="hdash-feed-title">
                <Activity size={14} />
                Riwayat Donasi Terbaru
                {liveCount > 0 && (
                  <span className="hdash-feed-count">{liveCount} total</span>
                )}
              </div>

              {!isConnected ? (
                <div className="hdash-feed-empty">
                  <Wallet size={28} />
                  <p>Hubungkan wallet untuk melihat feed donasi real-time</p>
                </div>
              ) : loading ? (
                <div className="hdash-feed-loading">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton hdash-skeleton" />
                  ))}
                </div>
              ) : recentDonations.length === 0 ? (
                <div className="hdash-feed-empty">
                  <Heart size={28} />
                  <p>Belum ada donasi. Jadilah yang pertama!</p>
                </div>
              ) : (
                <div className="hdash-feed" ref={feedRef}>
                  {/* Duplicate for seamless loop */}
                  {[...recentDonations, ...recentDonations].map((d, i) => {
                    const eth = parseFloat(formatEther(d.amount)).toFixed(4);
                    const initial = (d.donorName || '?').charAt(0).toUpperCase();
                    const title = getCampaignTitle(d.campaignId);
                    return (
                      <div key={i} className="hdash-feed-item">
                        <div className="hdash-feed-avatar">{initial}</div>
                        <div className="hdash-feed-body">
                          <div className="hdash-feed-row">
                            <span className="hdash-feed-name">{d.donorName || 'Anonim'}</span>
                            <span className="hdash-feed-amount">+{eth} ETH</span>
                          </div>
                          <div className="hdash-feed-campaign">
                            <Hash size={10} />
                            <span className="hdash-feed-camp-title">{title}</span>
                          </div>
                          <div className="hdash-feed-meta">
                            <Clock size={10} />
                            <span>{timeAgo(d.timestamp)}</span>
                            {d.message && (
                              <>
                                <span className="hdash-dot">·</span>
                                <span className="hdash-feed-msg">"{d.message}"</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer link */}
            <Link to="/transparency" className="hdash-footer-link">
              <BarChart2 size={14} />
              Lihat semua transaksi di halaman Transparansi
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {[
              { label: 'Total Kampanye', value: stats?.totalCampaigns ?? '—', icon: Globe, color: '#818cf8' },
              { label: 'Total Donasi', value: stats?.totalDonations ?? '—', icon: Heart, color: '#34d399' },
              { label: 'ETH Terkumpul', value: stats ? `${stats.totalFundsRaised} ETH` : '—', icon: TrendingUp, color: '#22d3ee' },
              { label: 'Kampanye Aktif', value: stats?.activeCampaigns ?? '—', icon: Star, color: '#fbbf24' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="stat-card glass-card">
                <div className="stat-card-icon" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <p className="stat-card-value">{value}</p>
                  <p className="stat-card-label">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="features-section section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Keunggulan Platform</span>
            <h2 className="section-title">Mengapa <span className="gradient-text">ChainDonate</span>?</h2>
            <p className="section-desc">
              Kami memanfaatkan teknologi blockchain untuk menyelesaikan masalah kurangnya transparansi
              dalam sistem donasi konvensional.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className={`feature-card feature-${color}`}>
                <div className="feature-icon-wrap">
                  <Icon size={24} />
                </div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="how-section section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Cara Kerja</span>
            <h2 className="section-title">Mulai Donasi dalam <span className="gradient-text">4 Langkah</span></h2>
          </div>
          <div className="how-grid">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} className="how-item">
                <div className="how-step">{step}</div>
                <div className="how-line" style={{ opacity: i < HOW_IT_WORKS.length - 1 ? 1 : 0 }} />
                <h3 className="how-title">{title}</h3>
                <p className="how-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CAMPAIGNS ===== */}
      <section className="campaigns-section section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="section-tag">Kampanye Terpopuler</span>
              <h2 className="section-title">Dukung <span className="gradient-text">Kampanye Nyata</span></h2>
            </div>
            <Link to="/campaigns" className="view-all-btn">
              Lihat Semua <ChevronRight size={16} />
            </Link>
          </div>

          {!isConnected ? (
            <div className="connect-notice">
              <Zap size={32} className="connect-notice-icon" />
              <h3>Hubungkan Wallet untuk Melihat Kampanye</h3>
              <p>Anda perlu menghubungkan MetaMask untuk mengakses data kampanye dari blockchain.</p>
            </div>
          ) : loading ? (
            <div className="campaigns-skeleton-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 360 }} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="empty-state">
              <Heart size={48} style={{ color: 'var(--primary-400)', opacity: 0.5 }} />
              <p>Belum ada kampanye. Deploy smart contract dan buat kampanye pertama!</p>
            </div>
          ) : (
            <div className="campaigns-grid">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id.toString()} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="cta-section">
        <div className="cta-glow" />
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Siap Berdonasi Transparan?</h2>
            <p className="cta-desc">
              Bergabung dengan platform donasi berbasis blockchain dan pastikan donasi Anda
              sampai ke tangan yang tepat.
            </p>
            <div className="cta-actions">
              <Link to="/campaigns" className="btn-hero-primary">
                <Heart size={18} />
                Mulai Berdonasi
              </Link>
              <Link to="/create" className="btn-hero-secondary">
                <Zap size={18} />
                Buat Kampanye
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
