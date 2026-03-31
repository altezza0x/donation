import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { formatEther } from 'viem';
import {
  BarChart3, TrendingUp, Users, Heart, Globe, Shield,
  ExternalLink, Copy, RefreshCw, Search, Clock, CheckCircle,
  Wallet, ArrowUpRight, X, Hash
} from 'lucide-react';
import './TransparencyPage.css';

// Format bytes32 txHash → tampilkan singkat, kembalikan full hex
function formatHash(hash) {
  if (!hash || hash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return null;
  }
  // hash sudah berupa hex string 0x...
  const h = typeof hash === 'string' ? hash : `0x${BigInt(hash).toString(16).padStart(64, '0')}`;
  return h;
}

function shortHash(hash) {
  if (!hash) return '-';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function TransparencyPage() {
  const { contract, isConnected } = useWeb3();
  const [stats, setStats] = useState(null);
  const [allDonations, setAllDonations] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTx, setSearchTx] = useState('');
  const [tab, setTab] = useState('donations'); // 'donations' | 'campaigns' | 'withdrawals'
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [copiedHash, setCopiedHash] = useState('');

  const fetchData = async (showRefresh = false) => {
    if (!contract) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true);
    try {
      const [platformStats, donations, campaigns, withdrawalsList] = await Promise.all([
        contract.getPlatformStats(),
        contract.getAllDonations(),
        contract.getAllCampaigns(),
        contract.getAllWithdrawals(),
      ]);

      setStats({
        totalCampaigns: Number(platformStats[0]),
        totalDonations: Number(platformStats[1]),
        totalFundsRaised: formatEther(platformStats[2]),
        activeCampaigns: Number(platformStats[3]),
      });

      setAllDonations([...donations].reverse());
      setAllCampaigns([...campaigns]);
      setAllWithdrawals([...withdrawalsList].reverse());
    } catch (err) {
      console.error('Error fetching transparency data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [contract]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(key);
    setTimeout(() => setCopiedHash(''), 2000);
  };

  const filteredDonations = allDonations.filter(d => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    const hash = formatHash(d.txHash) || '';
    return d.donor.toLowerCase().includes(q) ||
      d.donorName.toLowerCase().includes(q) ||
      d.campaignId.toString().includes(q) ||
      hash.toLowerCase().includes(q);
  });

  const filteredCampaigns = allCampaigns.filter(c => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    return c.title.toLowerCase().includes(q) ||
      c.owner.toLowerCase().includes(q) ||
      c.id.toString().includes(q);
  });

  const filteredWithdrawals = allWithdrawals.filter(w => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    const hash = formatHash(w.txHash) || '';
    return w.campaignTitle.toLowerCase().includes(q) ||
      w.recipient.toLowerCase().includes(q) ||
      w.campaignId.toString().includes(q) ||
      hash.toLowerCase().includes(q);
  });

  return (
    <div className="transparency-page">
      {/* Header */}
      <div className="transparency-header">
        <div className="transparency-header-bg" />
        <div className="container">
          <span className="section-tag">Transparansi Blockchain</span>
          <h1 className="transparency-title">
            Semua Transaksi <span className="gradient-text">Terbuka &amp; Terverifikasi</span>
          </h1>
          <p className="transparency-desc">
            Data ini diambil langsung dari smart contract di blockchain Ethereum.
            Setiap rekaman bersifat immutable dan dapat diverifikasi oleh siapapun.
          </p>
          <div className="transparency-badges">
            <span className="trans-badge"><Shield size={12} /> Smart Contract Verified</span>
            <span className="trans-badge"><CheckCircle size={12} /> Immutable Records</span>
            <span className="trans-badge"><Globe size={12} /> Publicly Accessible</span>
          </div>
        </div>
      </div>

      <div className="container">
        {!isConnected ? (
          <div className="transparency-gate">
            <Shield size={48} style={{ color: 'var(--primary-400)', opacity: 0.5 }} />
            <h2>Hubungkan Wallet</h2>
            <p>Hubungkan MetaMask untuk melihat data transparansi dari blockchain.</p>
          </div>
        ) : loading ? (
          <div className="transparency-loading">
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <p>Mengambil data dari blockchain...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="transparency-stats">
              {[
                { label: 'Total Kampanye', value: stats?.totalCampaigns, icon: Globe, color: '#818cf8' },
                { label: 'Total Transaksi', value: stats?.totalDonations, icon: Heart, color: '#34d399' },
                { label: 'Total ETH', value: stats ? parseFloat(stats.totalFundsRaised).toFixed(4) + ' ETH' : '—', icon: TrendingUp, color: '#22d3ee' },
                { label: 'Kampanye Aktif', value: stats?.activeCampaigns, icon: BarChart3, color: '#fbbf24' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="trans-stat-card glass-card">
                  <div className="trans-stat-icon" style={{ background: `${color}20`, border: `1px solid ${color}33` }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div>
                    <p className="trans-stat-val">{value}</p>
                    <p className="trans-stat-lbl">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search & Refresh */}
            <div className="transparency-controls">
              <div className="trans-search-wrapper">
                <Search size={15} className="trans-search-icon" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan address, nama, ID, atau tx hash..."
                  value={searchTx}
                  onChange={e => setSearchTx(e.target.value)}
                  className="trans-search-input"
                />
              </div>
              <button className="refresh-btn" onClick={() => fetchData(true)} disabled={refreshing}>
                <RefreshCw size={15} className={refreshing ? 'spinning' : ''} />
                {refreshing ? 'Refresh...' : 'Refresh'}
              </button>
            </div>

            {/* Tabs */}
            <div className="trans-tabs">
              <button
                className={`trans-tab ${tab === 'donations' ? 'active' : ''}`}
                onClick={() => setTab('donations')}
              >
                <Heart size={14} /> Riwayat Donasi ({allDonations.length})
              </button>
              <button
                className={`trans-tab ${tab === 'campaigns' ? 'active' : ''}`}
                onClick={() => setTab('campaigns')}
              >
                <Globe size={14} /> Semua Kampanye ({allCampaigns.length})
              </button>
              <button
                className={`trans-tab ${tab === 'withdrawals' ? 'active' : ''}`}
                onClick={() => setTab('withdrawals')}
              >
                <Wallet size={14} /> Penarikan Dana ({allWithdrawals.length})
              </button>
            </div>

            {/* TABLE: Donations */}
            {tab === 'donations' && (
              <div className="trans-table-wrapper">
                <table className="trans-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Donatur</th>
                      <th>Wallet</th>
                      <th>Kampanye</th>
                      <th>Jumlah</th>
                      <th>Waktu</th>
                      <th>Pesan</th>
                      <th>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="trans-empty">
                          {allDonations.length === 0 ? 'Belum ada donasi' : 'Tidak ada hasil pencarian'}
                        </td>
                      </tr>
                    ) : filteredDonations.map((d, i) => {
                      const txHash = formatHash(d.txHash);
                      return (
                        <tr key={i} className="trans-row clickable" onClick={() => setSelectedDonation(d)}>
                          <td>
                            <span className="tx-id">#{d.id.toString()}</span>
                          </td>
                          <td>
                            <span className="donor-name">{d.donorName}</span>
                          </td>
                          <td>
                            <div className="addr-cell">
                              <span className="addr monospace">
                                {d.donor.slice(0, 6)}...{d.donor.slice(-4)}
                              </span>
                              <button className="copy-tiny" onClick={(e) => { e.stopPropagation(); copyText(d.donor, `addr-${i}`); }} title="Salin address">
                                {copiedHash === `addr-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className="withdrawal-campaign">
                              <span className="withdrawal-campaign-title">
                                {allCampaigns.find(c => c.id.toString() === d.campaignId.toString())?.title || `Kampanye #${d.campaignId.toString()}`}
                              </span>
                              <span className="withdrawal-campaign-id monospace" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Kampanye #{d.campaignId.toString()}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="amount-cell">
                              {Number(formatEther(d.amount)).toFixed(4)} ETH
                            </span>
                          </td>
                          <td>
                            <span className="time-cell">
                              <Clock size={11} />
                              {new Date(Number(d.timestamp) * 1000).toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td>
                            <span className="msg-cell">{d.message || '-'}</span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {txHash ? (
                              <div className="hash-cell">
                                <Hash size={10} className="hash-icon" />
                                <span className="hash-text monospace" title={txHash}>
                                  {shortHash(txHash)}
                                </span>
                                <button
                                  className="copy-tiny"
                                  onClick={() => copyText(txHash, `dhash-${i}`)}
                                  title="Salin hash"
                                >
                                  {copiedHash === `dhash-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                </button>
                              </div>
                            ) : (
                              <span className="hash-null">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLE: Campaigns */}
            {tab === 'campaigns' && (
              <div className="trans-table-wrapper">
                <table className="trans-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Judul</th>
                      <th>Pemilik</th>
                      <th>Target</th>
                      <th>Terkumpul</th>
                      <th>Donatur</th>
                      <th>Status</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="trans-empty">
                          {allCampaigns.length === 0 ? 'Belum ada kampanye' : 'Tidak ada hasil pencarian'}
                        </td>
                      </tr>
                    ) : filteredCampaigns.map((c, i) => {
                      const target = Number(formatEther(c.targetAmount));
                      const raised = Number(formatEther(c.raisedAmount));
                      const progress = Math.min((raised / target) * 100, 100);
                      const isExpired = Number(c.deadline) * 1000 < Date.now();
                      return (
                        <tr key={i} className="trans-row">
                          <td><span className="tx-id">#{c.id.toString()}</span></td>
                          <td>
                            <div className="campaign-title-cell">
                              <span className="campaign-title-text">{c.title}</span>
                              <span className="mini-badge">{c.category}</span>
                            </div>
                          </td>
                          <td>
                            <div className="addr-cell">
                              <span className="addr monospace">{c.owner.slice(0, 6)}...{c.owner.slice(-4)}</span>
                              <button className="copy-tiny" onClick={() => copyText(c.owner, `cowner-${i}`)}>
                                {copiedHash === `cowner-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                              </button>
                            </div>
                          </td>
                          <td><span className="amount-cell">{target.toFixed(4)} ETH</span></td>
                          <td>
                            <div className="progress-cell">
                              <span>{raised.toFixed(4)} ETH</span>
                              <div className="mini-progress">
                                <div style={{ width: `${progress}%` }} />
                              </div>
                              <span className="pct-text">{progress.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td><span>{Number(c.donorCount)}</span></td>
                          <td>
                            <span className={`status-badge ${c.isActive && !isExpired ? 'active' : 'inactive'}`}>
                              {c.isWithdrawn ? 'Ditarik' : c.isActive && !isExpired ? '● Aktif' : 'Selesai'}
                            </span>
                          </td>
                          <td>
                            <span className="time-cell" style={{ fontSize: 11 }}>
                              {new Date(Number(c.deadline) * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLE: Withdrawals */}
            {tab === 'withdrawals' && (
              <div className="trans-table-wrapper">
                <table className="trans-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Kampanye</th>
                      <th>Penerima</th>
                      <th>Jumlah</th>
                      <th>Waktu</th>
                      <th>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-cell">
                          {allWithdrawals.length === 0
                            ? 'Belum ada penarikan dana'
                            : 'Tidak ada hasil pencarian'}
                        </td>
                      </tr>
                    ) : filteredWithdrawals.map((w, i) => {
                      const txHash = formatHash(w.txHash);
                      return (
                        <tr key={i} className="trans-row">
                          <td><span className="id-badge">#{w.id.toString()}</span></td>
                          <td>
                            <div className="withdrawal-campaign">
                              <span className="withdrawal-campaign-title">{w.campaignTitle}</span>
                              <span className="withdrawal-campaign-id monospace" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Kampanye #{w.campaignId.toString()}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="wallet-cell">
                              <span className="addr monospace">{w.recipient.slice(0, 6)}...{w.recipient.slice(-4)}</span>
                              <button className="copy-tiny" onClick={() => copyText(w.recipient, `wrecp-${i}`)}>
                                {copiedHash === `wrecp-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className="amount-cell withdrawal-amount">
                              <ArrowUpRight size={12} style={{ color: 'var(--warning-400)' }} />
                              {Number(formatEther(w.amount)).toFixed(4)} ETH
                            </span>
                          </td>
                          <td>
                            <span className="time-cell">
                              <Clock size={11} />
                              {new Date(Number(w.timestamp) * 1000).toLocaleString('id-ID', {
                                day: 'numeric', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td>
                            {txHash ? (
                              <div className="hash-cell">
                                <Hash size={10} className="hash-icon" />
                                <span className="hash-text monospace" title={txHash}>
                                  {shortHash(txHash)}
                                </span>
                                <button
                                  className="copy-tiny"
                                  onClick={() => copyText(txHash, `whash-${i}`)}
                                  title="Salin hash"
                                >
                                  {copiedHash === `whash-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                </button>
                              </div>
                            ) : (
                              <span className="hash-null">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Donation Detail Modal */}
      {selectedDonation && (
        <div className="trans-modal-overlay" onClick={() => setSelectedDonation(null)}>
          <div className="trans-modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="trans-modal-header">
              <h3>
                <Heart size={16} className="text-primary-400" />
                Detail Donasi #{selectedDonation.id.toString()}
              </h3>
              <button className="trans-modal-close" onClick={() => setSelectedDonation(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="trans-modal-body">
              <div className="trans-detail-grid">
                <span className="trans-detail-label">Donatur</span>
                <span className="trans-detail-value">{selectedDonation.donorName || 'Anonim'}</span>

                <span className="trans-detail-label">Wallet Address</span>
                <div className="addr-cell">
                  <span className="trans-detail-value monospace" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {selectedDonation.donor}
                  </span>
                  <button className="copy-tiny" onClick={() => copyText(selectedDonation.donor, 'modal-addr')} title="Salin address">
                    {copiedHash === 'modal-addr' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                  </button>
                </div>

                <span className="trans-detail-label">Kampanye</span>
                <span className="trans-detail-value">
                  {allCampaigns.find(c => c.id.toString() === selectedDonation.campaignId.toString())?.title || `Kampanye #${selectedDonation.campaignId.toString()}`}
                </span>

                <span className="trans-detail-label">Jumlah Donasi</span>
                <span className="trans-detail-value" style={{ color: 'var(--success-400)' }}>
                  {Number(formatEther(selectedDonation.amount)).toFixed(4)} ETH
                </span>

                <span className="trans-detail-label">Waktu Transaksi</span>
                <span className="trans-detail-value" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                  {new Date(Number(selectedDonation.timestamp) * 1000).toLocaleString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>

                {/* Tx Hash */}
                {formatHash(selectedDonation.txHash) && (
                  <>
                    <span className="trans-detail-label">Tx Hash</span>
                    <div className="addr-cell">
                      <div className="modal-hash-box">
                        <Hash size={11} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                        <span className="monospace modal-hash-text" title={formatHash(selectedDonation.txHash)}>
                          {formatHash(selectedDonation.txHash)}
                        </span>
                      </div>
                      <button
                        className="copy-tiny"
                        onClick={() => copyText(formatHash(selectedDonation.txHash), 'modal-hash')}
                        title="Salin hash"
                        style={{ flexShrink: 0 }}
                      >
                        {copiedHash === 'modal-hash' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="trans-detail-msg-box">
                {selectedDonation.message ? (
                  <p className="trans-detail-msg-text">{selectedDonation.message}</p>
                ) : (
                  <p className="trans-detail-msg-text" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                    Tanpa pesan dari donatur.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
