import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { formatEther } from 'viem';
import { Link } from 'react-router-dom';
import {
  User, Wallet, Heart, Globe, TrendingUp, Copy,
  ExternalLink, Clock, Target, ChevronRight, ArrowUpRight,
  X, Shield, CheckCircle
} from 'lucide-react';
import './ProfilePage.css';

export default function ProfilePage() {
  const { contract, account, user, isConnected, shortAddress } = useWeb3();
  const [myDonations, setMyDonations] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [myWithdrawals, setMyWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('donations');
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!contract || !account) { setLoading(false); return; }
      try {
        const [dons, camps, allWithdrawals] = await Promise.all([
          contract.getUserDonations(account),
          contract.getUserCampaigns(account),
          contract.getAllWithdrawals(),
        ]);
        setMyDonations([...dons].reverse());
        setMyCampaigns([...camps]);
        // Filter penarikan yang dilakukan oleh akun ini (sebagai pemilik kampanye)
        const myW = [...allWithdrawals].filter(
          (w) => w.recipient.toLowerCase() === account.toLowerCase()
        ).reverse();
        setMyWithdrawals(myW);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [contract, account]);

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    import('react-hot-toast').then(({ default: toast }) => toast.success('Address disalin!'));
  };

  if (!isConnected) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="profile-gate">
            <Wallet size={48} style={{ color: 'var(--primary-400)', opacity: 0.6 }} />
            <h2>Hubungkan Wallet</h2>
            <p>Hubungkan MetaMask untuk melihat profil Anda.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        {/* Profile Header */}
        <div className="profile-header-card glass-card">
          <div className="profile-avatar">
            {user ? user.name.charAt(0).toUpperCase() : account?.charAt(2).toUpperCase()}
          </div>
          <div className="profile-info">
            {user?.isRegistered ? (
              <>
                <h1 className="profile-name">{user.name}</h1>
                <div className="profile-meta">
                  <span className={`role-badge-profile ${user.role}`}>
                    {user.role === 'donor' ? '❤️ Donatur' : '🏢 Penerima / Penggalang'}
                  </span>
                  {user.email && <span className="profile-email">{user.email}</span>}
                </div>
              </>
            ) : (
              <div>
                <h1 className="profile-name">Pengguna Baru</h1>
                <Link to="/register" className="register-prompt">
                  Daftar untuk mengaktifkan fitur penuh →
                </Link>
              </div>
            )}
            <div className="wallet-address-row">
              <span className="wallet-addr-label">Wallet:</span>
              <span className="wallet-addr monospace">{account}</span>
              <button className="copy-btn-sm" onClick={copyAddress}>
                <Copy size={12} />
              </button>
            </div>
          </div>

          {/* Stats */}
          {user?.isRegistered && (
            <div className="profile-stats">
              <div className="profile-stat">
                <p className="profile-stat-val">{myDonations.length}</p>
                <p className="profile-stat-lbl">Total Donasi</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-val">
                  {myDonations.reduce((acc, curr) => acc + Number(formatEther(curr.amount)), 0).toFixed(4)}
                </p>
                <p className="profile-stat-lbl">ETH Didonasikan</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-val">{myCampaigns.length}</p>
                <p className="profile-stat-lbl">Kampanye Dibuat</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-val">
                  {user.registeredAt ? new Date(user.registeredAt * 1000).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'}
                </p>
                <p className="profile-stat-lbl">Bergabung</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${tab === 'donations' ? 'active' : ''}`}
            onClick={() => setTab('donations')}
          >
            <Heart size={14} /> Riwayat Donasi ({myDonations.length})
          </button>
          <button
            className={`profile-tab ${tab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setTab('campaigns')}
          >
            <Globe size={14} /> Kampanye Saya ({myCampaigns.length})
          </button>
          <button
            className={`profile-tab ${tab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setTab('withdrawals')}
          >
            <ArrowUpRight size={14} /> Penarikan Dana ({myWithdrawals.length})
          </button>
        </div>

        {loading ? (
          <div className="profile-loading">
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : (
          <>
            {/* Donations Tab */}
            {tab === 'donations' && (
              <div className="profile-list">
                {myDonations.length === 0 ? (
                  <div className="profile-empty">
                    <Heart size={40} style={{ opacity: 0.3 }} />
                    <p>Belum ada donasi. <Link to="/campaigns">Mulai berdonasi!</Link></p>
                  </div>
                ) : myDonations.map((d, i) => (
                  <div
                    key={i}
                    className="profile-donation-item clickable"
                    onClick={() => setSelectedDonation(d)}
                    title="Klik untuk melihat detail"
                  >
                    <div className="donation-icon-wrap">
                      <Heart size={16} />
                    </div>
                    <div className="profile-donation-main">
                      <div className="pd-header">
                        <span className="pd-campaign">Kampanye #{d.campaignId.toString()}</span>
                        <span className="pd-amount">+{Number(formatEther(d.amount)).toFixed(4)} ETH</span>
                      </div>
                      {d.message && <p className="pd-message">"{d.message}"</p>}
                      <div className="pd-footer">
                        <Clock size={11} />
                        {new Date(Number(d.timestamp) * 1000).toLocaleString('id-ID')}
                        <span className="pd-hint">· Klik untuk detail</span>
                      </div>
                    </div>
                    <Link
                      to={`/campaigns/${d.campaignId}`}
                      className="pd-link"
                      onClick={(e) => e.stopPropagation()}
                      title="Lihat kampanye"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Campaigns Tab */}
            {tab === 'campaigns' && (
              <div className="profile-list">
                {myCampaigns.length === 0 ? (
                  <div className="profile-empty">
                    <Globe size={40} style={{ opacity: 0.3 }} />
                    <p>Belum ada kampanye. <Link to="/create">Buat kampanye!</Link></p>
                  </div>
                ) : myCampaigns.map((c, i) => {
                  const target = Number(formatEther(c.targetAmount));
                  const raised = Number(formatEther(c.raisedAmount));
                  const progress = Math.min((raised / target) * 100, 100);
                  const isExpired = Number(c.deadline) * 1000 < Date.now();
                  return (
                    <div key={i} className="profile-campaign-item">
                      <div className="pc-header">
                        <div>
                          <h3 className="pc-title">{c.title}</h3>
                          <span className={`pc-status ${c.isActive && !isExpired ? 'active' : 'inactive'}`}>
                            {c.isWithdrawn ? 'Dana Ditarik' : c.isActive && !isExpired ? '● Aktif' : 'Selesai'}
                          </span>
                        </div>
                        <Link to={`/campaigns/${c.id}`} className="pc-link">
                          Lihat <ChevronRight size={14} />
                        </Link>
                      </div>
                      <div className="progress-bar" style={{ margin: '12px 0 8px' }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="pc-stats">
                        <span><TrendingUp size={12} /> {raised.toFixed(4)} ETH terkumpul</span>
                        <span><Target size={12} /> Target: {target.toFixed(4)} ETH</span>
                        <span><User size={12} /> {Number(c.donorCount)} donatur</span>
                        <span className="pc-pct">{progress.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Withdrawals Tab */}
            {tab === 'withdrawals' && (
              <div className="profile-list">
                {myWithdrawals.length === 0 ? (
                  <div className="profile-empty">
                    <ArrowUpRight size={40} style={{ opacity: 0.3 }} />
                    <p>Belum ada penarikan dana yang dilakukan oleh akun Anda.</p>
                  </div>
                ) : myWithdrawals.map((w, i) => (
                  <div key={i} className="profile-withdrawal-item">
                    <div className="withdrawal-icon-wrap">
                      <ArrowUpRight size={16} />
                    </div>
                    <div className="profile-withdrawal-main">
                      <div className="pw-header">
                        <div className="pw-campaign">
                          <span className="pw-campaign-title">{w.campaignTitle}</span>
                          <span className="pw-campaign-id">Kampanye #{w.campaignId.toString()}</span>
                        </div>
                        <span className="pw-amount">
                          <ArrowUpRight size={13} style={{ color: 'var(--warning-400)' }} />
                          {Number(formatEther(w.amount)).toFixed(4)} ETH
                        </span>
                      </div>
                      <div className="pw-footer">
                        <CheckCircle size={11} style={{ color: 'var(--success-400)' }} />
                        <span className="pw-status">Berhasil ditarik</span>
                        <span className="pw-dot">·</span>
                        <Clock size={11} />
                        {new Date(Number(w.timestamp) * 1000).toLocaleString('id-ID')}
                      </div>
                      <div className="pw-recipient">
                        <Shield size={11} style={{ color: 'var(--primary-400)' }} />
                        <span className="monospace pw-addr">
                          {w.recipient.slice(0, 8)}...{w.recipient.slice(-6)}
                        </span>
                        <span className="pw-id-badge">ID #{w.id.toString()}</span>
                      </div>
                    </div>
                    <Link
                      to={`/campaigns/${w.campaignId}`}
                      className="pd-link"
                      title="Lihat kampanye"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Donation Detail Modal */}
      {selectedDonation && (
        <div className="profile-modal-overlay" onClick={() => setSelectedDonation(null)}>
          <div className="profile-modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>
                <Heart size={16} style={{ color: 'var(--primary-400)' }} />
                Detail Donasi #{selectedDonation.id.toString()}
              </h3>
              <button className="profile-modal-close" onClick={() => setSelectedDonation(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="profile-modal-body">
              <div className="profile-detail-grid">
                <span className="profile-detail-label">Donatur</span>
                <span className="profile-detail-value">{selectedDonation.donorName || 'Anonim'}</span>

                <span className="profile-detail-label">Wallet Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="profile-detail-value monospace" style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    {selectedDonation.donor}
                  </span>
                  <button
                    className="copy-btn-sm"
                    onClick={() => navigator.clipboard.writeText(selectedDonation.donor)}
                    title="Salin address"
                  >
                    <Copy size={12} />
                  </button>
                </div>

                <span className="profile-detail-label">Kampanye</span>
                <Link
                  to={`/campaigns/${selectedDonation.campaignId}`}
                  className="profile-detail-value"
                  style={{ color: 'var(--primary-400)', textDecoration: 'none' }}
                  onClick={() => setSelectedDonation(null)}
                >
                  Kampanye #{selectedDonation.campaignId.toString()} <ExternalLink size={12} />
                </Link>

                <span className="profile-detail-label">Jumlah Donasi</span>
                <span className="profile-detail-value" style={{ color: 'var(--success-400)', fontWeight: 700 }}>
                  {Number(formatEther(selectedDonation.amount)).toFixed(4)} ETH
                </span>

                <span className="profile-detail-label">Waktu Transaksi</span>
                <span className="profile-detail-value" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                  {new Date(Number(selectedDonation.timestamp) * 1000).toLocaleString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </div>

              {selectedDonation.message ? (
                <div className="profile-detail-msg-box">
                  <p className="profile-detail-msg-label">Pesan dari donatur:</p>
                  <p className="profile-detail-msg-text">"{selectedDonation.message}"</p>
                </div>
              ) : (
                <div className="profile-detail-msg-box">
                  <p className="profile-detail-msg-text" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                    Tanpa pesan dari donatur.
                  </p>
                </div>
              )}

              <Link
                to={`/campaigns/${selectedDonation.campaignId}`}
                className="profile-modal-cta"
                onClick={() => setSelectedDonation(null)}
              >
                <Globe size={14} /> Lihat Halaman Kampanye
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
