import { Link } from 'react-router-dom';
import { formatUsdc } from '../contracts/MockUSDC';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import './CampaignCard.css';

const CATEGORY_COLORS = {
  Pendidikan:    { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
  Kesehatan:     { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  'Bencana Alam':{ bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.25)'  },
  Keagamaan:     { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  Sosial:        { bg: 'rgba(6,182,212,0.12)',   color: '#22d3ee', border: 'rgba(6,182,212,0.25)'  },
  Lainnya:       { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.25)'},
};

const CATEGORY_EMOJIS = {
  Pendidikan: '🎓', Kesehatan: '🏥', 'Bencana Alam': '🆘',
  Keagamaan: '🕌', Sosial: '🤝', Lainnya: '💡',
};

export default function CampaignCard({ campaign }) {
  const target   = formatUsdc(campaign.targetAmount);
  const raised   = formatUsdc(campaign.raisedAmount);
  const progress = Math.min((raised / target) * 100, 100);
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const daysLeft = Math.max(0, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24)));
  const isExpired = deadline < new Date();
  const catColor = CATEGORY_COLORS[campaign.category] ?? CATEGORY_COLORS['Lainnya'];
  const catEmoji = CATEGORY_EMOJIS[campaign.category] ?? '💡';
  const isActive = campaign.isActive && !isExpired;

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className={`campaign-card${!isActive ? ' campaign-card-inactive' : ''}`}
    >

      {/* ── Thumbnail ── */}
      <div
        className="campaign-thumbnail"
        style={campaign.imageUrl
          ? { backgroundImage: `url(${campaign.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {}}
      >
        {!campaign.imageUrl && <div className="campaign-emoji">{catEmoji}</div>}
        <div className="campaign-overlay" />
        {!isActive && <span className="campaign-status-badge">Selesai</span>}
      </div>

      {/* ── Body ── */}
      <div className="campaign-content">

        {/* Category */}
        <span
          className="campaign-category"
          style={{ background: catColor.bg, color: catColor.color, border: `1px solid ${catColor.border}` }}
        >
          {campaign.category}
        </span>

        {/* Title */}
        <h3 className="campaign-title">{campaign.title}</h3>

        {/* Description */}
        <p className="campaign-desc">{campaign.description}</p>

        {/* Progress */}
        <div className="campaign-progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-stats">
            <span className="progress-raised">
              <TrendingUp size={11} />
              {raised.toFixed(2)} USDC terkumpul
            </span>
            <span className="progress-pct">{progress.toFixed(1)}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="campaign-stats">
          <div className="stat-item">
            <p className="stat-value">{target.toFixed(0)} USDC</p>
            <p className="stat-label">Target</p>
          </div>
          <div className="stat-item">
            <p className="stat-value">{Number(campaign.donorCount)}</p>
            <p className="stat-label">Donatur</p>
          </div>
          <div className="stat-item">
            <p className={`stat-value${isExpired ? ' expired-text' : ''}`}>
              {isExpired ? 'Berakhir' : `${daysLeft} hari`}
            </p>
            <p className="stat-label">Tersisa</p>
          </div>
        </div>

        {/* CTA — span, bukan Link, karena sudah dalam Link */}
        <span className="campaign-btn">
          {isActive ? 'Donasi Sekarang' : 'Lihat Detail'}
        </span>
      </div>
    </Link>
  );
}
