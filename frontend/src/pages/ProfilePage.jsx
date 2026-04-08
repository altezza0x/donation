import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { formatUsdc } from '../contracts/MockUSDC';
import { Link } from 'react-router-dom';
import { getAllTxHashes } from '../api';
import {
  User, Wallet, Heart, Globe, TrendingUp, Copy,
  ExternalLink, Clock, Target, ChevronRight, ArrowUpRight,
  X, Shield, CheckCircle, ChevronLeft, Hash
} from 'lucide-react';
import './ProfilePage.css';

function formatHash(hash) {
  if (!hash || hash === '0x0000000000000000000000000000000000000000000000000000000000000000') return null;
  return typeof hash === 'string' ? hash : `0x${BigInt(hash).toString(16).padStart(64, '0')}`;
}
function shortHash(hash) {
  if (!hash) return '-';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

const PG_SIZES = [5, 10, 25];

function usePagination(data, defaultSize = 5) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(defaultSize);
  const total = Math.max(1, Math.ceil(data.length / size));
  const safePage = Math.min(page, total);
  const paged = data.slice((safePage - 1) * size, safePage * size);
  useEffect(() => { setPage(1); }, [data.length]);
  return {
    page: safePage, size, total, paged,
    goFirst: () => setPage(1),
    goLast: () => setPage(total),
    goPrev: () => setPage(p => Math.max(1, p - 1)),
    goNext: () => setPage(p => Math.min(total, p + 1)),
    setSize: (s) => { setSize(s); setPage(1); },
  };
}

function Pagination({ page, size, total, goFirst, goLast, goPrev, goNext, setSize }) {
  return (
    <div className="profile-pagination">
      <div className="profile-pg-left">
        <span className="profile-pg-label">Show:</span>
        <select
          className="profile-pg-select"
          value={size}
          onChange={e => setSize(Number(e.target.value))}
        >
          {PG_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="profile-pg-label">Records</span>
      </div>
      <div className="profile-pg-right">
        <button className="profile-pg-btn" onClick={goFirst} disabled={page === 1}>First</button>
        <button className="profile-pg-btn profile-pg-icon" onClick={goPrev} disabled={page === 1}>
          <ChevronLeft size={13} />
        </button>
        <span className="profile-pg-info">Page {page} of {total}</span>
        <button className="profile-pg-btn profile-pg-icon" onClick={goNext} disabled={page === total}>
          <ChevronRight size={13} />
        </button>
        <button className="profile-pg-btn" onClick={goLast} disabled={page === total}>Last</button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { contract, account, user, isConnected, shortAddress } = useWeb3();
  const [myDonations, setMyDonations] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [myWithdrawals, setMyWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('donations');
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  const donationPg = usePagination(myDonations);
  const campaignPg = usePagination(myCampaigns);
  const withdrawalPg = usePagination(myWithdrawals);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const getCampaignTitle = (id) => {
    const found = allCampaigns.find(c => c.id.toString() === id.toString());
    return found ? found.title : `Kampanye #${id.toString()}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!contract || !account) { setLoading(false); return; }
      try {
        const [dons, camps, allWithdrawals, mongoHashes] = await Promise.all([
          contract.getUserDonations(account),
          contract.getUserCampaigns(account),
          contract.getAllWithdrawals(),
          getAllTxHashes(),
        ]);

        let realTxHashMap = {};
        mongoHashes.forEach(item => {
          if (!item || !item.type || !item.refId || !item.txHash) return;
          if (item.type === 'campaign') {
            realTxHashMap[`camp-${item.refId}`] = item.txHash;
          } else if (item.type === 'donation') {
            realTxHashMap[`don-${item.refId}`] = item.txHash;
          } else if (item.type === 'withdrawal') {
            realTxHashMap[`wit-${item.refId}`] = item.txHash;
          }
        });

        const vDons = dons.map(d => ({
          ...d,
          txHash: localStorage.getItem(`don-tx-${d.id.toString()}`) || realTxHashMap[`don-${d.id.toString()}`] || d.txHash
        }));

        const vCamps = camps.map(c => ({
          ...c,
          txHash: localStorage.getItem(`camp-tx-${c.id.toString()}`) || realTxHashMap[`camp-${c.id.toString()}`] || null
        }));

        setMyDonations([...vDons].reverse());
        setMyCampaigns([...vCamps]);
        const myW = [...allWithdrawals].filter(
          (w) => w.recipient.toLowerCase() === account.toLowerCase()
        ).map(w => ({
          ...w,
          txHash: localStorage.getItem(`wit-tx-${w.campaignId.toString()}-${w.timestamp.toString()}`) || realTxHashMap[`wit-${w.campaignId.toString()}-${w.timestamp.toString()}`] || w.txHash
        })).reverse();
        setMyWithdrawals(myW);

        // Fetch all campaigns for title lookup
        const allCamps = await contract.getAllCampaigns();
        setAllCampaigns([...allCamps]);
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
            <p>Hubungkan wallet untuk melihat profil Anda.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalDonated = myDonations.reduce((acc, curr) => acc + formatUsdc(curr.amount), 0).toFixed(2);

  return (
    <div className="profile-page">
      <div className="container">

        {/* ── Profile Header ── */}
        <div className="profile-header-card glass-card">

          {/* Avatar + Info */}
          <div className="profile-top-row">
            <div className="profile-avatar">
              {user ? user.name.charAt(0).toUpperCase() : account?.charAt(2).toUpperCase()}
            </div>

            <div className="profile-info">
              {user?.isRegistered ? (
                <>
                  <h1 className="profile-name">{user.name}</h1>
                  <div className="profile-meta">
                    <span className={`role-badge-profile ${user.role}`}>
                      {user.role === 'donor' ? '❤️ Donatur' : '🏢 Penggalang'}
                    </span>
                    <div className="wallet-address-inline">
                      <span className="wallet-addr monospace">{account}</span>
                      <button className="copy-btn-sm" onClick={copyAddress} title="Salin Address">
                        <Copy size={12} />
                      </button>
                    </div>
                    {user.email && <span className="profile-email">{user.email}</span>}
                  </div>
                </>
              ) : (
                <div>
                  <h1 className="profile-name">Pengguna Baru</h1>
                  <div className="profile-meta">
                    <div className="wallet-address-inline">
                      <span className="wallet-addr monospace">{account}</span>
                      <button className="copy-btn-sm" onClick={copyAddress} title="Salin Address">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  <Link to="/register" className="register-prompt">
                    Daftar untuk mengaktifkan fitur penuh →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          {user?.isRegistered && (
            <div className="profile-stats">
              <div className="profile-stat">
                <p className="profile-stat-val">{myDonations.length}</p>
                <p className="profile-stat-lbl">Total Donasi</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-val">{totalDonated}</p>
                <p className="profile-stat-lbl">USDC Disumbang</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-val">{myCampaigns.length}</p>
                <p className="profile-stat-lbl">Kampanye</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-val">
                  {(() => {
                    if (!user?.registeredAt) return '-';
                    const val = user.registeredAt;
                    // Jika string (ISO), langsung parse. Jika angka, cek ms vs s.
                    const dateObj = isNaN(val)
                      ? new Date(val)
                      : new Date(Number(val) > 10000000000 ? Number(val) : Number(val) * 1000);

                    return isNaN(dateObj.getTime())
                      ? '-'
                      : dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                  })()}
                </p>
                <p className="profile-stat-lbl">Bergabung</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${tab === 'donations' ? 'active' : ''}`}
            onClick={() => setTab('donations')}
          >
            Riwayat Donasi ({myDonations.length})
          </button>
          <button
            className={`profile-tab ${tab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setTab('campaigns')}
          >
            Kampanye Saya ({myCampaigns.length})
          </button>
          <button
            className={`profile-tab ${tab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setTab('withdrawals')}
          >
            Penarikan Dana ({myWithdrawals.length})
          </button>
        </div>

        {loading ? (
          <div className="profile-loading">
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : (
          <>
            {/* ── Donations Tab ── */}
            {tab === 'donations' && (
              <div className="profile-list">
                {myDonations.length === 0 ? (
                  <div className="profile-empty">
                    <p>Belum ada donasi. <Link to="/campaigns">Mulai berdonasi!</Link></p>
                  </div>
                ) : (
                  <>
                    <Pagination {...donationPg} />

                    {/* ── Desktop Table ── */}
                    <div className="pd-table-wrap">
                      <table className="pd-table">
                        <thead>
                          <tr>
                            <th className="pd-th col-id">ID</th>
                            <th className="pd-th col-campaign">Kampanye</th>
                            <th className="pd-th col-amount">Jumlah</th>
                            <th className="pd-th col-time">Waktu</th>
                            <th className="pd-th col-msg">Pesan</th>
                            <th className="pd-th col-hash">Tx Hash</th>
                            <th className="pd-th col-act"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {donationPg.paged.map((d, i) => {
                            const txHash = formatHash(d.txHash);
                            return (
                              <tr key={i} className="pd-tr" onClick={() => setSelectedDonation(d)}>
                                <td><span className="pd-id-badge">#{d.id.toString()}</span></td>
                                <td>
                                  <div className="pd-camp-cell">
                                    <span className="pd-camp-title">{getCampaignTitle(d.campaignId)}</span>
                                    <span className="pd-camp-sub">Kampanye #{d.campaignId.toString()}</span>
                                  </div>
                                </td>
                                <td><span className="pd-amount-cell">+{formatUsdc(d.amount).toFixed(2)} USDC</span></td>
                                <td>
                                  <span className="pd-time-cell">
                                    <Clock size={10} />
                                    {new Date(Number(d.timestamp) * 1000).toLocaleString('id-ID')}
                                  </span>
                                </td>
                                <td>
                                  <span className="pd-msg-cell">{d.message || <em style={{ opacity: 0.4 }}>—</em>}</span>
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                  {txHash ? (
                                    <div className="pd-hash-cell">
                                      <Hash size={10} style={{ color: 'var(--primary-400)', opacity: 0.6, flexShrink: 0 }} />
                                      <span className="pd-hash-text" title={txHash}>{shortHash(txHash)}</span>
                                      <button className="pd-copy-btn" onClick={() => copyText(txHash, `h-${i}`)} title="Salin">
                                        {copiedKey === `h-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                      </button>
                                    </div>
                                  ) : <span className="pd-hash-null">—</span>}
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                  <Link to={`/campaigns/${d.campaignId}`} className="pd-ext-btn" title="Lihat kampanye">
                                    <ExternalLink size={13} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Mobile Cards ── */}
                    <div className="pd-cards-wrap">
                      {donationPg.paged.map((d, i) => {
                        const txHash = formatHash(d.txHash);
                        return (
                          <div key={i} className="pd-card" onClick={() => setSelectedDonation(d)}>

                            {/* Row 1: ID + Amount */}
                            <div className="pd-card-row1">
                              <span className="pd-id-badge">#{d.id.toString()}</span>
                              <span className="pd-amount-cell">+{formatUsdc(d.amount).toFixed(2)} USDC</span>
                            </div>

                            {/* Row 2: Campaign title */}
                            <div className="pd-card-camp">
                              <span className="pd-card-camp-title">{getCampaignTitle(d.campaignId)}</span>
                              <span className="pd-card-camp-sub">Kampanye #{d.campaignId.toString()}</span>
                            </div>

                            {/* Row 3: Waktu */}
                            <div className="pd-card-time">
                              <Clock size={11} />
                              {new Date(Number(d.timestamp) * 1000).toLocaleString('id-ID')}
                            </div>

                            {/* Row 4: Pesan (opsional) */}
                            {d.message && (
                              <div className="pd-card-msg">💬 {d.message}</div>
                            )}

                            {/* Row 5: Tx Hash (opsional) */}
                            {txHash && (
                              <div className="pd-card-hash" onClick={e => e.stopPropagation()}>
                                <Hash size={10} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                                <span className="pd-hash-text" title={txHash}>{shortHash(txHash)}</span>
                                <button className="pd-copy-btn" onClick={() => copyText(txHash, `mc-${i}`)}>
                                  {copiedKey === `mc-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                </button>
                              </div>
                            )}

                            {/* Row 6: Actions */}
                            <div className="pd-card-footer" onClick={e => e.stopPropagation()}>
                              <button className="pd-detail-btn" onClick={e => { e.stopPropagation(); setSelectedDonation(d); }}>
                                Detail
                              </button>
                              <Link to={`/campaigns/${d.campaignId}`} className="pd-ext-btn">
                                <ExternalLink size={13} /> Lihat Kampanye
                              </Link>
                            </div>

                          </div>
                        );
                      })}
                    </div>


                    <Pagination {...donationPg} />
                  </>
                )}
              </div>
            )}

            {/* ── Campaigns Tab ── */}
            {tab === 'campaigns' && (
              <div className="profile-list">
                {myCampaigns.length === 0 ? (
                  <div className="profile-empty">
                    <p>Belum ada kampanye. <Link to="/create">Buat kampanye!</Link></p>
                  </div>
                ) : (
                  <>
                    {campaignPg.paged.map((c, i) => {
                      const target = formatUsdc(c.targetAmount);
                      const raised = formatUsdc(c.raisedAmount);
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
                              Lihat <ChevronRight size={13} />
                            </Link>
                          </div>

                          <div className="pc-progress-row">
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                          </div>

                          <div className="pc-stats">
                            <div className="pc-stat-item">
                              <span className="pc-stat-label">Terkumpul</span>
                              <span className="pc-stat-val success">{raised.toFixed(2)} USDC</span>
                            </div>
                            <div className="pc-stat-item">
                              <span className="pc-stat-label">Target</span>
                              <span className="pc-stat-val">{target.toFixed(2)} USDC</span>
                            </div>
                            <div className="pc-stat-item">
                              <span className="pc-stat-label">Donatur</span>
                              <span className="pc-stat-val">{Number(c.donorCount)}</span>
                            </div>
                            <div className="pc-stat-item">
                              <span className="pc-stat-label">Progress</span>
                              <span className="pc-stat-val primary">{progress.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Pagination {...campaignPg} />
                  </>
                )}
              </div>
            )}

            {/* ── Withdrawals Tab ── */}
            {tab === 'withdrawals' && (
              <div className="profile-list">
                {myWithdrawals.length === 0 ? (
                  <div className="profile-empty">
                    <p>Belum ada penarikan dana yang dilakukan oleh akun Anda.</p>
                  </div>
                ) : (
                  <div className="pw-cards-container">
                    {withdrawalPg.paged.map((w, i) => (
                      <div key={i} className="pw-card">
                        <div className="pw-card-header">
                          <div className="pw-card-icon">
                            <Wallet size={20} />
                          </div>
                          <div className="pw-card-title-col">
                            <h4>{w.campaignTitle}</h4>
                            <span>Kampanye #{w.campaignId.toString()}</span>
                          </div>
                          <div className="pw-card-amount-col">
                            <strong>{formatUsdc(w.amount).toFixed(2)} USDC</strong>
                            <Link to={`/campaigns/${w.campaignId}`}>
                              Detail Kampanye <ArrowUpRight size={12} />
                            </Link>
                          </div>
                        </div>
                        <div className="pw-card-grid">
                          <div className="pw-grid-item">
                            <span className="pw-lbl">Status</span>
                            <span className="pw-val success"><CheckCircle size={12} /> Berhasil ditarik</span>
                          </div>
                          <div className="pw-grid-item">
                            <span className="pw-lbl">Waktu Ditarik</span>
                            <span className="pw-val">
                              {new Date(Number(w.timestamp) * 1000).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="pw-grid-item">
                            <span className="pw-lbl">Tujuan Penarikan</span>
                            <span className="pw-val" title={w.purpose}>{w.purpose || '-'}</span>
                          </div>
                          <div className="pw-grid-item">
                            <span className="pw-lbl">Wallet Penerima</span>
                            <span className="pw-val monospace">
                              {w.recipient.slice(0, 8)}...{w.recipient.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Pagination {...withdrawalPg} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Donation Detail Modal ── */}
      {selectedDonation && (
        <div className="profile-modal-overlay" onClick={() => setSelectedDonation(null)}>
          <div className="profile-modal-content glass-card" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
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

                {/* Donatur */}
                <span className="profile-detail-label">Donatur</span>
                <span className="profile-detail-value">{selectedDonation.donorName || 'Anonim'}</span>

                {/* Wallet */}
                <span className="profile-detail-label">Wallet</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span className="profile-detail-value monospace" style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {selectedDonation.donor}
                  </span>
                  <button className="copy-btn-sm" onClick={() => copyText(selectedDonation.donor, 'modal-addr')}>
                    {copiedKey === 'modal-addr' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Kampanye */}
                <span className="profile-detail-label">Kampanye</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="profile-detail-value" style={{ color: 'var(--text-primary)' }}>
                    {getCampaignTitle(selectedDonation.campaignId)}
                  </span>
                  <Link
                    to={`/campaigns/${selectedDonation.campaignId}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--primary-400)', textDecoration: 'none' }}
                    onClick={() => setSelectedDonation(null)}
                  >
                    <ExternalLink size={11} /> Lihat halaman kampanye
                  </Link>
                </div>

                {/* Jumlah */}
                <span className="profile-detail-label">Jumlah</span>
                <span className="profile-detail-value" style={{ color: 'var(--success-400)', fontWeight: 700, fontSize: 16 }}>
                  +{formatUsdc(selectedDonation.amount).toFixed(2)} USDC
                </span>

                {/* Waktu */}
                <span className="profile-detail-label">Waktu</span>
                <span className="profile-detail-value" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                  {new Date(Number(selectedDonation.timestamp) * 1000).toLocaleString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>

                {/* Tx Hash */}
                {formatHash(selectedDonation.txHash) && (
                  <>
                    <span className="profile-detail-label">Tx Hash</span>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                      <div className="modal-txhash-box">
                        <Hash size={11} style={{ color: 'var(--primary-400)', flexShrink: 0, marginTop: 1 }} />
                        <span className="modal-txhash-text">
                          {formatHash(selectedDonation.txHash)}
                        </span>
                      </div>
                      <button className="copy-btn-sm" style={{ flexShrink: 0 }} onClick={() => copyText(formatHash(selectedDonation.txHash), 'modal-hash')}>
                        {copiedKey === 'modal-hash' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </>
                )}

              </div>

              {/* Pesan */}
              <div className="profile-detail-msg-box">
                {selectedDonation.message ? (
                  <>
                    <p className="profile-detail-msg-label">Pesan dari donatur:</p>
                    <p className="profile-detail-msg-text">"{selectedDonation.message}"</p>
                  </>
                ) : (
                  <p className="profile-detail-msg-text" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                    Tanpa pesan dari donatur.
                  </p>
                )}
              </div>

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
