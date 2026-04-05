import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { formatEther } from 'viem';
import CampaignCard from '../components/CampaignCard';
import {
  Shield, Zap, TrendingUp, Users, Heart, ArrowRight,
  ChevronRight, Lock, Eye, CheckCircle, Globe, Star,
  Activity, Clock, Wallet, BarChart2, Hash, ArrowUpRight,
  MonitorSmartphone, UserPlus, Search, Sparkles, PlusCircle
} from 'lucide-react';
import './HomePage.css';

const CountUp = ({ end, duration = 2000, decimals = 0 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrame;
    const numericEnd = Number(end) || 0; // fallback if NaN

    if (numericEnd === 0) {
      setCount(0);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo for smooth deceleration
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(easeOut * numericEnd);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCount(numericEnd);
      }
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <>{count.toFixed(decimals)}</>;
};

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
  {
    step: '01',
    icon: MonitorSmartphone,
    title: 'Hubungkan Wallet',
    desc: 'Sambungkan MetaMask ke platform ChainDonate. Proses cepat dan aman.',
    color: 'primary',
    accent: '#818cf8',
  },
  {
    step: '02',
    icon: UserPlus,
    title: 'Daftar Akun',
    desc: 'Registrasi sebagai donatur atau penerima donasi dengan identitas terverifikasi.',
    color: 'accent',
    accent: '#22d3ee',
  },
  {
    step: '03',
    icon: Search,
    title: 'Pilih Kampanye',
    desc: 'Temukan kampanye yang ingin Anda dukung dari berbagai kategori.',
    color: 'success',
    accent: '#34d399',
  },
  {
    step: '04',
    icon: CheckCircle,
    title: 'Donasi & Verifikasi',
    desc: 'Kirim donasi — smart contract otomatis mencatat di blockchain secara permanen.',
    color: 'warning',
    accent: '#fbbf24',
  },
];

function timeAgo(timestampSeconds) {
  const diff = Math.floor(Date.now() / 1000) - Number(timestampSeconds);
  if (diff < 60) return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

export default function HomePage() {
  const { readOnlyContract, isConnected } = useWeb3();
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const feedRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!readOnlyContract) { setLoading(false); return; }
      try {
        const [platformStats, allCamps, donations] = await Promise.all([
          readOnlyContract.getPlatformStats(),
          readOnlyContract.getAllCampaigns(),
          readOnlyContract.getAllDonations(),
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
  }, [readOnlyContract]);

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
          <div className="hero-content hero-content-centered">
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
              — setiap donasi tercatat permanen, transparan, dan dapat dilacak siapa pun.
            </p>

            <div className="hero-actions animate-fade-in">
              <Link to="/campaigns" className="btn-hero-primary">
                <Heart size={18} />
                Mulai Donasi
              </Link>
              <Link to="/transparency" className="btn-hero-secondary">
                <Eye size={18} />
                Lihat Transparansi
              </Link>
            </div>



            {!isConnected && (
              <div className="hero-wallet-prompt animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <div className="wallet-prompt-glow"></div>
                <div className="wallet-prompt-content">
                  <div className="wallet-prompt-icon">
                    <Wallet size={16} />
                  </div>
                  <span className="wallet-prompt-text">
                    Hubungkan Wallet Anda Untuk Mulai Berdonasi
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-glass-panel">
            {[
              { label: 'Total Kampanye', value: stats?.totalCampaigns ?? 0, color: 'var(--primary-400)', decimals: 0 },
              { label: 'Total Donasi', value: stats?.totalDonations ?? 0, color: 'var(--success-400)', decimals: 0 },
              { label: 'ETH Terkumpul', value: stats ? stats.totalFundsRaised : 0, color: 'var(--accent-400)', isEth: true, decimals: 4 },
              { label: 'Kampanye Aktif', value: stats?.activeCampaigns ?? 0, color: 'var(--warning-400)', decimals: 0 },
            ].map(({ label, value, color, isEth, decimals }, index) => (
              <div key={label} className="panel-stat-item animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="panel-stat-value" style={{ color }}>
                  {stats ? <CountUp end={value} decimals={decimals} /> : '—'}
                  {isEth && stats && <span className="panel-stat-suffix" style={{ marginLeft: 6 }}>ETH</span>}
                </div>
                <div className="panel-stat-label">{label}</div>
                {index < 3 && <div className="panel-stat-divider" />}
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
            <p className="section-desc">Proses yang sederhana, transparan, dan aman berbasis teknologi blockchain.</p>
          </div>

          <div className="how-steps">
            {/* Connector line between cards (desktop only) */}
            <div className="how-steps-line" />

            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, accent }) => (
              <div key={step} className="how-step-card" style={{ '--how-accent': accent }}>
                <div className="how-step-badge">
                  <Icon size={22} />
                  <div className="how-step-badge-glow" />
                </div>
                <div className="how-step-text">
                  <div className="how-step-num">{step}</div>
                  <h3 className="how-step-title">{title}</h3>
                  <p className="how-step-desc">{desc}</p>
                </div>
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
              <h2 className="section-title">Dukung <span className="gradient-text">Kampanye</span></h2>
            </div>
            <Link to="/campaigns" className="view-all-btn">
              Lihat Semua <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
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
                <PlusCircle size={18} />
                Buat Kampanye
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
