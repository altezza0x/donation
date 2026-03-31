import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import { Clock, Users, Target, TrendingUp, ExternalLink } from 'lucide-react';
import './CampaignCard.css';

const CATEGORY_COLORS = {
  Pendidikan: { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  Kesehatan: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  'Bencana Alam': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  Keagamaan: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  Sosial: { bg: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' },
  Lainnya: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
};

const CATEGORY_EMOJIS = {
  Pendidikan: '🎓', Kesehatan: '🏥', 'Bencana Alam': '🆘',
  Keagamaan: '🕌', Sosial: '🤝', Lainnya: '💡',
};

export default function CampaignCard({ campaign }) {
  const target = Number(formatEther(campaign.targetAmount));
  const raised = Number(formatEther(campaign.raisedAmount));
  const progress = Math.min((raised / target) * 100, 100);
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const daysLeft = Math.max(0, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24)));
  const isExpired = deadline < new Date();
  const catColor = CATEGORY_COLORS[campaign.category] || CATEGORY_COLORS['Lainnya'];
  const catEmoji = CATEGORY_EMOJIS[campaign.category] || '💡';

  return (
    <div className={`campaign-card ${!campaign.isActive || isExpired ? 'campaign-card-inactive' : ''}`}>
      {/* Thumbnail */}
      <div 
        className="campaign-thumbnail"
        style={campaign.imageUrl ? { backgroundImage: `url(${campaign.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {!campaign.imageUrl && <div className="campaign-emoji">{catEmoji}</div>}
        <div className="campaign-overlay" />
        {/* Status */}
        {(!campaign.isActive || isExpired) && (
          <span className="campaign-status-badge">Selesai</span>
        )}
      </div>

      {/* Content */}
      <div className="campaign-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          {/* Category Badge */}
          <span
            className="campaign-category"
            style={{ background: catColor.bg, color: catColor.color, border: `1px solid ${catColor.border}` }}
          >
            {campaign.category}
          </span>
          
          <h3 className="campaign-title">{campaign.title}</h3>
        </div>
        <p className="campaign-desc">{campaign.description}</p>

        {/* Progress */}
        <div className="campaign-progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-stats">
            <span className="progress-raised">
              <TrendingUp size={12} />
              {raised.toFixed(4)} ETH
            </span>
            <span className="progress-pct">{progress.toFixed(1)}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="campaign-stats">
          <div className="stat-item">
            <Target size={13} className="stat-icon" />
            <div>
              <p className="stat-value">{target.toFixed(3)} ETH</p>
              <p className="stat-label">Target</p>
            </div>
          </div>
          <div className="stat-item">
            <Users size={13} className="stat-icon" />
            <div>
              <p className="stat-value">{Number(campaign.donorCount)}</p>
              <p className="stat-label">Donatur</p>
            </div>
          </div>
          <div className="stat-item">
            <Clock size={13} className={`stat-icon ${isExpired ? 'expired' : ''}`} />
            <div>
              <p className={`stat-value ${isExpired ? 'expired-text' : ''}`}>
                {isExpired ? 'Berakhir' : `${daysLeft} hari`}
              </p>
              <p className="stat-label">Tersisa</p>
            </div>
          </div>
        </div>

        {/* Action */}
        <Link to={`/campaigns/${campaign.id}`} className="campaign-btn">
          {campaign.isActive && !isExpired ? 'Donasi Sekarang' : 'Lihat Detail'}
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
