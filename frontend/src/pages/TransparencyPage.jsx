import { useState, useEffect, useMemo } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { formatUsdc } from '../contracts/MockUSDC';
import { parseAbiItem } from 'viem';
import { getAllTxHashes } from '../api';
import {
  BarChart3, TrendingUp, Users, Heart, Globe, Shield,
  ExternalLink, Copy, RefreshCw, Search, Clock, CheckCircle,
  Wallet, ArrowUpRight, X, Hash, ChevronLeft, ChevronRight, User, LayoutGrid, BadgeCheck, XCircle
} from 'lucide-react';
import { API_BASE } from '../api';
import './TransparencyPage.css';

// Format bytes32 txHash → kembalikan full hex string yang valid
function formatHash(hash) {
  if (!hash) return null;
  // Jika sudah string hex yang valid, dan bukan hash kosong
  if (typeof hash === 'string') {
    // Normalisasi (trim & pastikan lowercase untuk perbandingan)
    const h = hash.trim().toLowerCase();
    if (h === '0x' || h === '0x0000000000000000000000000000000000000000000000000000000000000000') return null;
    return hash; // Balikkan hash aslinya (bisa mixed-case)
  }
  // Jika BigInt or number, pad jadi 64 char + 0x (66 char total)
  try {
    const hex = BigInt(hash).toString(16);
    if (hex === '0') return null;
    return `0x${hex.padStart(64, '0')}`;
  } catch (e) {
    return null;
  }
}

function shortHash(hash) {
  if (!hash) return '-';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function usePagination(data, defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = data.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goFirst = () => setPage(1);
  const goLast = () => setPage(totalPages);
  const goPrev = () => setPage(p => Math.max(1, p - 1));
  const goNext = () => setPage(p => Math.min(totalPages, p + 1));

  // Reset to page 1 whenever data changes (e.g. search filter)
  useEffect(() => { setPage(1); }, [data.length]);

  return {
    page: safePage, pageSize, totalPages,
    paged, goFirst, goLast, goPrev, goNext,
    setPageSize: (s) => { setPageSize(s); setPage(1); },
  };
}

function Pagination({ page, pageSize, totalPages, total, goFirst, goLast, goPrev, goNext, setPageSize }) {
  return (
    <div className="trans-pagination">
      <div className="trans-pagination-left">
        <span className="pg-label">Show:</span>
        <select
          className="pg-select"
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="pg-label">Records</span>
      </div>

      <div className="trans-pagination-right">
        <button className="pg-btn" onClick={goFirst} disabled={page === 1} title="First">First</button>
        <button className="pg-btn pg-icon" onClick={goPrev} disabled={page === 1} title="Previous">
          <ChevronLeft size={14} />
        </button>
        <span className="pg-info">Page {page} of {totalPages}</span>
        <button className="pg-btn pg-icon" onClick={goNext} disabled={page === totalPages} title="Next">
          <ChevronRight size={14} />
        </button>
        <button className="pg-btn" onClick={goLast} disabled={page === totalPages} title="Last">Last</button>
      </div>
    </div>
  );
}

export default function TransparencyPage() {
  const { readOnlyContract, isConnected, networkId, provider } = useWeb3();
  const [stats, setStats] = useState(null);
  const [allDonations, setAllDonations] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  const [allWhitelisted, setAllWhitelisted] = useState([]);
  const [allRevoked, setAllRevoked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTx, setSearchTx] = useState('');
  const [tab, setTab] = useState('donations'); // 'donations' | 'campaigns' | 'withdrawals'
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [copiedHash, setCopiedHash] = useState('');

  const fetchData = async (showRefresh = false) => {
    if (!readOnlyContract) { setLoading(false); return; }

    let startTime;
    // Failsafe: jika RPC hang, hentikan loading setelah 20 detik
    const timeout = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 20000);

    if (showRefresh) {
      setRefreshing(true);
      startTime = Date.now();
    }

    try {
      const [platformStats, donations, campaigns, withdrawalsList, usersData] = await Promise.all([
        readOnlyContract.getPlatformStats(),
        readOnlyContract.getAllDonations(),
        readOnlyContract.getAllCampaigns(),
        readOnlyContract.getAllWithdrawals(),
        fetch(`${API_BASE}/users`).then(res => res.ok ? res.json() : null).catch(() => null)
      ]);

      let realTxHashMap = {};
      if (provider) {
        try {
          const isSepolia = networkId === '11155111';
          let fromBlock = 0n;

          if (isSepolia) {
            const currentBlock = await provider.getBlockNumber().catch(() => 5000000n);
            fromBlock = currentBlock > 90000n ? currentBlock - 90000n : 0n;
          }

          const [donationLogs, withdrawLogs, campaignLogs] = await Promise.all([
            provider.getLogs({
              address: import.meta.env.VITE_CONTRACT_ADDRESS,
              event: parseAbiItem('event DonationMade(uint256 indexed donationId, uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 timestamp)'),
              fromBlock,
            }).catch(() => []),
            provider.getLogs({
              address: import.meta.env.VITE_CONTRACT_ADDRESS,
              event: parseAbiItem('event FundsWithdrawn(uint256 indexed campaignId, address indexed recipient, uint256 amount, uint256 timestamp)'),
              fromBlock,
            }).catch(() => []),
            provider.getLogs({
              address: import.meta.env.VITE_CONTRACT_ADDRESS,
              event: parseAbiItem('event CampaignCreated(uint256 indexed campaignId, address indexed owner, string title, uint256 targetAmount, uint256 deadline)'),
              fromBlock,
            }).catch(() => [])
          ]);

          donationLogs.forEach(log => {
            if (log.args && log.args.donationId !== undefined) {
              realTxHashMap[`don-${log.args.donationId.toString()}`] = log.transactionHash;
            }
          });

          withdrawLogs.forEach(log => {
            if (log.args && log.args.campaignId !== undefined && log.args.timestamp !== undefined) {
              realTxHashMap[`wit-${log.args.campaignId.toString()}-${log.args.timestamp.toString()}`] = log.transactionHash;
            }
          });

          campaignLogs.forEach(log => {
            if (log.args && log.args.campaignId !== undefined) {
              realTxHashMap[`camp-${log.args.campaignId.toString()}`] = log.transactionHash;
            }
          });
        } catch (e) {
          console.warn('Failed to fetch real transaction logs:', e);
        }
      }

      // Fetch from MongoDB
      const mongoHashes = await getAllTxHashes();

      // Update global realTxHashMap with verified mongo hashes
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

      const verifiedDonations = donations.map(d => ({
        ...d,
        txHash: localStorage.getItem(`don-tx-${d.id.toString()}`) || realTxHashMap[`don-${d.id.toString()}`] || d.txHash
      }));

      const verifiedWithdrawals = withdrawalsList.map(w => ({
        ...w,
        txHash: localStorage.getItem(`wit-tx-${w.campaignId.toString()}-${w.timestamp.toString()}`) || realTxHashMap[`wit-${w.campaignId.toString()}-${w.timestamp.toString()}`] || w.txHash
      }));

      const verifiedCampaigns = campaigns.map(c => ({
        ...c,
        txHash: localStorage.getItem(`camp-tx-${c.id.toString()}`) || realTxHashMap[`camp-${c.id.toString()}`] || null
      }));

      setStats({
        totalCampaigns: Number(platformStats[0]),
        totalDonations: Number(platformStats[1]),
        totalFundsRaised: formatUsdc(platformStats[2]).toFixed(2),
        activeCampaigns: Number(platformStats[3]),
      });

      // ── WHITELIST: Baca langsung dari smart contract (getWhitelistedCreators) ──
      // Tidak bergantung pada MongoDB — setiap address yang di-whitelist PASTI muncul.
      let whitelisted = [];
      try {
        const whitelistedAddrs = await readOnlyContract.getWhitelistedCreators();
        // Buat lookup profile dari MongoDB untuk tampilkan nama (opsional)
        const profileMap = {};
        if (usersData && usersData.data) {
          usersData.data.forEach(u => {
            if (u.wallet) profileMap[u.wallet.toLowerCase()] = u;
          });
        }
        whitelisted = whitelistedAddrs.map(addr => {
          const profile = profileMap[addr.toLowerCase()];
          return {
            wallet: addr,
            name: profile?.name || null,
            email: profile?.email || '',
            role: profile?.role || '',
          };
        });
      } catch (e) {
        // Fallback: kontrak lama belum ada getWhitelistedCreators() — pakai metode lama
        console.warn('getWhitelistedCreators() tidak tersedia, gunakan fallback MongoDB user check:', e.message);
        if (usersData && usersData.data) {
          const checks = usersData.data.map(async (u) => {
            try {
              if (!u.wallet || !/^0x[a-fA-F0-9]{40}$/.test(u.wallet)) return null;
              const isWl = await readOnlyContract.verifiedCreators(u.wallet);
              return isWl ? u : null;
            } catch (e) {
              return null;
            }
          });
          whitelisted = (await Promise.all(checks)).filter(Boolean);
        }
      }

      // ── REVOKE: Baca event CreatorVerified(status=false) dari blockchain ──
      let revoked = [];
      if (provider) {
        try {
          const isSepolia = networkId === '11155111';
          const fromBlock = isSepolia ? 10620000n : 0n; // Mulai dari blok deploy kontrak baru
          const revokeLogs = await provider.getLogs({
            address: import.meta.env.VITE_CONTRACT_ADDRESS,
            event: parseAbiItem('event CreatorVerified(address indexed creator, bool indexed status, uint256 timestamp)'),
            fromBlock,
          }).catch(() => []);

          // Buat lookup profile dari MongoDB untuk tampilkan nama
          const profileMap = {};
          if (usersData && usersData.data) {
            usersData.data.forEach(u => {
              if (u.wallet) profileMap[u.wallet.toLowerCase()] = u;
            });
          }

          // Filter hanya event revoke (status === false)
          const revokeOnlyLogs = revokeLogs.filter(log => log.args && log.args.status === false);
          revoked = revokeOnlyLogs.map(log => {
            const addr = log.args.creator;
            const profile = profileMap[addr.toLowerCase()];
            return {
              wallet: addr,
              name: profile?.name || null,
              txHash: log.transactionHash,
              timestamp: Number(log.args.timestamp),
            };
          }).reverse();
        } catch (e) {
          console.warn('Failed to fetch revoke logs:', e);
        }
      }

      setAllDonations([...verifiedDonations].reverse());
      setAllCampaigns([...verifiedCampaigns].reverse());
      setAllWithdrawals([...verifiedWithdrawals].reverse());
      setAllWhitelisted([...whitelisted].reverse());
      setAllRevoked(revoked);
    } catch (err) {
      console.error('Error fetching transparency data:', err);
    } finally {
      clearTimeout(timeout);
      if (showRefresh) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 800) {
          await new Promise(res => setTimeout(res, 800 - elapsed));
        }
      }
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [readOnlyContract]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(key);
    setTimeout(() => setCopiedHash(''), 2000);
  };

  const filteredDonations = useMemo(() => allDonations.filter(d => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    const hash = formatHash(d.txHash) || '';
    return d.donor.toLowerCase().includes(q) ||
      d.donorName.toLowerCase().includes(q) ||
      d.campaignId.toString().includes(q) ||
      hash.toLowerCase().includes(q);
  }), [allDonations, searchTx]);

  const filteredCampaigns = useMemo(() => allCampaigns.filter(c => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    return c.title.toLowerCase().includes(q) ||
      c.owner.toLowerCase().includes(q) ||
      c.id.toString().includes(q);
  }), [allCampaigns, searchTx]);

  const filteredWithdrawals = useMemo(() => allWithdrawals.filter(w => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    const hash = formatHash(w.txHash) || '';
    return w.campaignTitle.toLowerCase().includes(q) ||
      w.recipient.toLowerCase().includes(q) ||
      w.campaignId.toString().includes(q) ||
      hash.toLowerCase().includes(q);
  }), [allWithdrawals, searchTx]);

  const filteredWhitelisted = useMemo(() => allWhitelisted.filter(w => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    return (w.name && w.name.toLowerCase().includes(q)) ||
      w.wallet.toLowerCase().includes(q);
  }), [allWhitelisted, searchTx]);

  const filteredRevoked = useMemo(() => allRevoked.filter(r => {
    if (!searchTx) return true;
    const q = searchTx.toLowerCase();
    return (r.name && r.name.toLowerCase().includes(q)) ||
      r.wallet.toLowerCase().includes(q) ||
      (r.txHash && r.txHash.toLowerCase().includes(q));
  }), [allRevoked, searchTx]);

  // Pagination hooks
  const donationPg = usePagination(filteredDonations);
  const campaignPg = usePagination(filteredCampaigns);
  const withdrawalPg = usePagination(filteredWithdrawals);
  const whitelistPg = usePagination(filteredWhitelisted);
  const revokePg = usePagination(filteredRevoked);

  // Explorer URL Helpers
  const isSepolia = networkId === '11155111';
  const explorerUrl = isSepolia ? 'https://sepolia.etherscan.io' : '';
  const getTxUrl = (hash) => explorerUrl ? `${explorerUrl}/tx/${hash}` : '#';

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
        {loading ? (
          <div className="transparency-loading">
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <p>Mengambil data dari blockchain...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="transparency-stats">
              {[
                {
                  label: 'Total Kampanye',
                  value: stats?.totalCampaigns ?? '—',
                  desc: 'Kampanye terdaftar di blockchain',
                  accent: '#818cf8',
                },
                {
                  label: 'Total Transaksi',
                  value: stats?.totalDonations ?? '—',
                  desc: 'Donasi yang tercatat on-chain',
                  accent: '#34d399',
                },
                {
                  label: 'Total Dana',
                  value: stats ? stats.totalFundsRaised + ' USDC' : '—',
                  desc: 'Akumulasi seluruh donasi',
                  accent: '#22d3ee',
                },
                {
                  label: 'Kampanye Aktif',
                  value: stats?.activeCampaigns ?? '—',
                  desc: 'Masih berjalan & belum expired',
                  accent: '#fbbf24',
                },
              ].map(({ label, value, desc, accent }) => (
                <div
                  key={label}
                  className="trans-stat-card"
                  style={{ '--stat-accent': accent }}
                >
                  <p className="trans-stat-lbl">{label}</p>
                  <p className="trans-stat-val">{value}</p>
                  <p className="trans-stat-desc">{desc}</p>
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
              <button
                className={`trans-tab ${tab === 'whitelist' ? 'active' : ''}`}
                onClick={() => setTab('whitelist')}
              >
                <BadgeCheck size={14} /> Daftar Whitelist ({allWhitelisted.length})
              </button>
              <button
                className={`trans-tab ${tab === 'revoke' ? 'active' : ''}`}
                onClick={() => setTab('revoke')}
                style={allRevoked.length > 0 ? { '--tab-active-color': 'var(--danger-400, #f87171)' } : {}}
              >
                <XCircle size={14} /> Daftar Revoke ({allRevoked.length})
              </button>
            </div>

            {/* TABLE: Donations */}
            {tab === 'donations' && (
              <div className="trans-list-container">
                <Pagination {...donationPg} total={filteredDonations.length} />
                <div className="trans-table-wrapper">
                  <table className="trans-table">
                    <thead>
                      <tr>
                        <th className="col-id">ID</th>
                        <th className="col-name">Donatur</th>
                        <th className="col-wallet">Wallet</th>
                        <th className="col-camp">Kampanye</th>
                        <th className="col-amount">Jumlah</th>
                        <th className="col-time">Waktu</th>
                        <th className="col-msg">Pesan</th>
                        <th className="col-hash">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donationPg.paged.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="trans-empty">
                            {allDonations.length === 0 ? 'Belum ada donasi' : 'Tidak ada hasil pencarian'}
                          </td>
                        </tr>
                      ) : donationPg.paged.map((d, i) => {
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
                                {formatUsdc(d.amount).toFixed(2)} USDC
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
                                  {explorerUrl ? (
                                    <a href={getTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="hash-text monospace" style={{ color: 'var(--primary-400)', textDecoration: 'none' }} title={txHash}>
                                      {shortHash(txHash)}
                                    </a>
                                  ) : (
                                    <span className="hash-text monospace" title={txHash}>
                                      {shortHash(txHash)}
                                    </span>
                                  )}
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
                <Pagination {...donationPg} total={filteredDonations.length} />
              </div>
            )}

            {/* TABLE: Campaigns */}
            {tab === 'campaigns' && (
              <div className="trans-list-container">
                <Pagination {...campaignPg} total={filteredCampaigns.length} />
                <div className="trans-table-wrapper">
                  <table className="trans-table">
                    <thead>
                      <tr>
                        <th className="col-id">ID</th>
                        <th className="col-camp">Judul</th>
                        <th className="col-wallet">Pemilik</th>
                        <th className="col-amount">Target</th>
                        <th className="col-amount">Terkumpul</th>
                        <th className="col-id">Donatur</th>
                        <th className="col-status">Status</th>
                        <th className="col-time">Deadline</th>
                        <th className="col-hash">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignPg.paged.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="trans-empty">
                            {allCampaigns.length === 0 ? 'Belum ada kampanye' : 'Tidak ada hasil pencarian'}
                          </td>
                        </tr>
                      ) : campaignPg.paged.map((c, i) => {
                        const target = formatUsdc(c.targetAmount);
                        const raised = formatUsdc(c.raisedAmount);
                        const progress = Math.min((raised / target) * 100, 100);
                        const isExpired = Number(c.deadline) * 1000 < Date.now();
                        return (
                          <tr key={i} className="trans-row clickable" onClick={() => setSelectedCampaign(c)}>
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
                                <button className="copy-tiny" onClick={(e) => { e.stopPropagation(); copyText(c.owner, `cowner-${i}`); }}>
                                  {copiedHash === `cowner-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                </button>
                              </div>
                            </td>
                            <td><span className="amount-cell">{target.toFixed(2)} USDC</span></td>
                            <td>
                              <div className="progress-cell">
                                <span>{raised.toFixed(2)} USDC</span>
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
                            <td onClick={(e) => e.stopPropagation()}>
                              {formatHash(c.txHash) ? (
                                <div className="hash-cell">
                                  <Hash size={10} className="hash-icon" />
                                  {explorerUrl ? (
                                    <a href={getTxUrl(formatHash(c.txHash))} target="_blank" rel="noopener noreferrer" className="hash-text monospace" style={{ color: 'var(--primary-400)', textDecoration: 'none' }} title={formatHash(c.txHash)}>
                                      {shortHash(formatHash(c.txHash))}
                                    </a>
                                  ) : (
                                    <span className="hash-text monospace" title={formatHash(c.txHash)}>
                                      {shortHash(formatHash(c.txHash))}
                                    </span>
                                  )}
                                  <button
                                    className="copy-tiny"
                                    onClick={() => copyText(formatHash(c.txHash), `chash-${i}`)}
                                    title="Salin hash"
                                  >
                                    {copiedHash === `chash-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
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
                <Pagination {...campaignPg} total={filteredCampaigns.length} />
              </div>
            )}

            {/* TABLE: Withdrawals */}
            {tab === 'withdrawals' && (
              <div className="trans-list-container">
                <Pagination {...withdrawalPg} total={filteredWithdrawals.length} />
                <div className="trans-table-wrapper">
                  <table className="trans-table">
                    <thead>
                      <tr>
                        <th className="col-id">ID</th>
                        <th className="col-camp">Kampanye</th>
                        <th className="col-wallet">Penerima</th>
                        <th className="col-amount">Jumlah</th>
                        <th className="col-purpose">Tujuan</th>
                        <th className="col-time">Waktu</th>
                        <th className="col-hash">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalPg.paged.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="empty-cell">
                            {allWithdrawals.length === 0
                              ? 'Belum ada penarikan dana'
                              : 'Tidak ada hasil pencarian'}
                          </td>
                        </tr>
                      ) : withdrawalPg.paged.map((w, i) => {
                        const txHash = formatHash(w.txHash);
                        return (
                          <tr key={i} className="trans-row clickable" onClick={() => setSelectedWithdrawal(w)}>
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
                                <button className="copy-tiny" onClick={(e) => { e.stopPropagation(); copyText(w.recipient, `wrecp-${i}`); }}>
                                  {copiedHash === `wrecp-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                </button>
                              </div>
                            </td>
                            <td>
                              <span className="amount-cell withdrawal-amount">
                                <ArrowUpRight size={12} style={{ color: 'var(--warning-400)' }} />
                                {formatUsdc(w.amount).toFixed(2)} USDC
                              </span>
                            </td>
                            <td>
                              <span className="purpose-cell" style={{ fontSize: 13 }}>{w.purpose || '-'}</span>
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
                            <td onClick={(e) => e.stopPropagation()}>
                              {txHash ? (
                                <div className="hash-cell">
                                  <Hash size={10} className="hash-icon" />
                                  {explorerUrl ? (
                                    <a href={getTxUrl(txHash)} target="_blank" rel="noopener noreferrer" className="hash-text monospace" style={{ color: 'var(--primary-400)', textDecoration: 'none' }} title={txHash}>
                                      {shortHash(txHash)}
                                    </a>
                                  ) : (
                                    <span className="hash-text monospace" title={txHash}>
                                      {shortHash(txHash)}
                                    </span>
                                  )}
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
                <Pagination {...withdrawalPg} total={filteredWithdrawals.length} />
              </div>
            )}

            {/* TABLE: Whitelist */}
            {tab === 'whitelist' && (
              <div className="trans-list-container">
                <Pagination {...whitelistPg} total={filteredWhitelisted.length} />
                <div className="trans-table-wrapper">
                  <table className="trans-table">
                    <thead>
                      <tr>
                        <th className="col-id" style={{ width: '80px' }}>No</th>
                        <th className="col-name">Nama Otoritas</th>
                        <th className="col-wallet">Wallet Address</th>
                        <th className="col-amount" style={{ width: '130px' }}>Total Kampanye</th>
                        <th className="col-amount" style={{ width: '140px' }}>Total Penarikan</th>
                        <th className="col-status">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whitelistPg.paged.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-cell">
                            {allWhitelisted.length === 0
                              ? 'Belum ada akun di whitelist'
                              : 'Tidak ada hasil pencarian'}
                          </td>
                        </tr>
                      ) : whitelistPg.paged.map((w, i) => {
                        const userWithdrawals = allWithdrawals.filter(wd => wd.recipient.toLowerCase() === w.wallet.toLowerCase());
                        const totalWithdrawn = userWithdrawals.reduce((sum, curr) => sum + Number(formatUsdc(curr.amount)), 0);
                        const userCampaignsCount = allCampaigns.filter(camp => camp.owner.toLowerCase() === w.wallet.toLowerCase()).length;

                        return (
                          <tr key={i} className="trans-row">
                            <td>
                              <span className="id-badge">{(whitelistPg.page - 1) * whitelistPg.pageSize + i + 1}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BadgeCheck size={16} style={{ color: 'var(--success-400)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.name || 'Anonim'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="wallet-cell">
                                <span className="addr monospace">{w.wallet}</span>
                                <button className="copy-tiny" onClick={() => copyText(w.wallet, `wlt-${i}`)}>
                                  {copiedHash === `wlt-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                </button>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userCampaignsCount}</span>
                                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>Kampanye</span>
                              </div>
                            </td>
                            <td>
                              <span className="amount-cell withdrawal-amount">
                                {totalWithdrawn > 0 ? (
                                  <>
                                    <ArrowUpRight size={12} style={{ color: 'var(--warning-400)' }} />
                                    {totalWithdrawn.toFixed(2)} USDC
                                  </>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>0.00 USDC</span>
                                )}
                              </span>
                            </td>
                            <td>
                              <span className="status-badge active">Verified</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination {...whitelistPg} total={filteredWhitelisted.length} />
              </div>
            )}

            {/* TABLE: Revoke */}
            {tab === 'revoke' && (
              <div className="trans-list-container">
                <Pagination {...revokePg} total={filteredRevoked.length} />
                <div className="trans-table-wrapper">
                  <table className="trans-table">
                    <thead>
                      <tr>
                        <th className="col-id" style={{ width: '60px' }}>No</th>
                        <th className="col-name">Nama (Profil)</th>
                        <th className="col-wallet">Wallet Address</th>
                        <th className="col-time">Waktu Revoke</th>
                        <th className="col-hash">Tx Hash Bukti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revokePg.paged.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty-cell">
                            {allRevoked.length === 0
                              ? 'Belum ada address yang dicabut aksesnya'
                              : 'Tidak ada hasil pencarian'}
                          </td>
                        </tr>
                      ) : revokePg.paged.map((r, i) => (
                        <tr key={i} className="trans-row">
                          <td>
                            <span className="id-badge" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger-400, #f87171)' }}>
                              {(revokePg.page - 1) * revokePg.pageSize + i + 1}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <XCircle size={15} style={{ color: 'var(--danger-400, #f87171)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {r.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Tidak terdaftar</span>}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="wallet-cell">
                              <span className="addr monospace">{r.wallet}</span>
                              <button className="copy-tiny" onClick={() => copyText(r.wallet, `rev-addr-${i}`)}>
                                {copiedHash === `rev-addr-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            {r.timestamp ? (
                              <span className="time-cell">
                                <Clock size={11} />
                                {new Date(r.timestamp * 1000).toLocaleString('id-ID', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            ) : <span className="hash-null">—</span>}
                          </td>
                          <td>
                            {r.txHash ? (
                              <div className="hash-cell">
                                <Hash size={10} className="hash-icon" style={{ color: 'var(--danger-400, #f87171)' }} />
                                {explorerUrl ? (
                                  <a href={getTxUrl(r.txHash)} target="_blank" rel="noopener noreferrer"
                                    className="hash-text monospace"
                                    style={{ color: 'var(--danger-400, #f87171)', textDecoration: 'none' }}
                                    title={r.txHash}>
                                    {shortHash(r.txHash)}
                                  </a>
                                ) : (
                                  <span className="hash-text monospace" title={r.txHash}>{shortHash(r.txHash)}</span>
                                )}
                                <button className="copy-tiny" onClick={() => copyText(r.txHash, `rev-hash-${i}`)} title="Salin hash">
                                  {copiedHash === `rev-hash-${i}` ? <CheckCircle size={10} style={{ color: 'var(--success-400)' }} /> : <Copy size={10} />}
                                </button>
                              </div>
                            ) : (
                              <span className="hash-null">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...revokePg} total={filteredRevoked.length} />
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
              <div className="trans-detail-list">
                <div className="trans-detail-row">
                  <span className="trans-detail-label">Donatur</span>
                  <span className="trans-detail-value">{selectedDonation.donorName || 'Anonim'}</span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Wallet Address</span>
                  <div className="modal-addr-row">
                    <span className="trans-detail-value monospace modal-addr-text" title={selectedDonation.donor}>
                      {selectedDonation.donor}
                    </span>
                    <button className="copy-tiny" onClick={() => copyText(selectedDonation.donor, 'modal-addr')} title="Salin address">
                      {copiedHash === 'modal-addr' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Kampanye</span>
                  <span className="trans-detail-value">
                    {allCampaigns.find(c => c.id.toString() === selectedDonation.campaignId.toString())?.title || `Kampanye #${selectedDonation.campaignId.toString()}`}
                  </span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Jumlah Donasi</span>
                  <span className="trans-detail-value" style={{ color: 'var(--success-400)' }}>
                    {formatUsdc(selectedDonation.amount).toFixed(2)} USDC
                  </span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Waktu Transaksi</span>
                  <span className="trans-detail-value" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                    {new Date(Number(selectedDonation.timestamp) * 1000).toLocaleString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                </div>

                {/* Tx Hash */}
                {formatHash(selectedDonation.txHash) && (
                  <div className="trans-detail-row">
                    <span className="trans-detail-label">Tx Hash</span>
                    <div className="modal-addr-row">
                      <div className="modal-hash-box">
                        {explorerUrl ? (
                          <a href={getTxUrl(formatHash(selectedDonation.txHash))} target="_blank" rel="noopener noreferrer" className="monospace modal-hash-text" style={{ color: 'var(--primary-400)', textDecoration: 'none' }} title={formatHash(selectedDonation.txHash)}>
                            {formatHash(selectedDonation.txHash)}
                          </a>
                        ) : (
                          <span className="monospace modal-hash-text" title={formatHash(selectedDonation.txHash)}>
                            {formatHash(selectedDonation.txHash)}
                          </span>
                        )}
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
                  </div>
                )}
              </div>

              <div className="trans-detail-msg-box">
                <span className="trans-detail-msg-label">Pesan Donatur:</span>
                <div className="trans-detail-msg-content">
                  {selectedDonation.message ? (
                    <span className="trans-detail-msg-text">{selectedDonation.message}</span>
                  ) : (
                    <span className="trans-detail-msg-text" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                      [Tidak ada pesan tambahan]
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <div className="trans-modal-overlay" onClick={() => setSelectedCampaign(null)}>
          <div className="trans-modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="trans-modal-header">
              <h3>
                <LayoutGrid size={16} className="text-primary-400" />
                Detail Kampanye #{selectedCampaign.id.toString()}
              </h3>
              <button className="trans-modal-close" onClick={() => setSelectedCampaign(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="trans-modal-body">
              <div className="trans-detail-list">
                <div className="trans-detail-row">
                  <span className="trans-detail-label">Judul Kampanye</span>
                  <span className="trans-detail-value">{selectedCampaign.title}</span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Kategori</span>
                  <span className="trans-detail-value">{selectedCampaign.category}</span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Kreator (Owner)</span>
                  <div className="modal-addr-row">
                    <span className="trans-detail-value monospace modal-addr-text" title={selectedCampaign.owner}>
                      {selectedCampaign.owner}
                    </span>
                    <button className="copy-tiny" onClick={() => copyText(selectedCampaign.owner, 'modal-camp-owner')} title="Salin address">
                      {copiedHash === 'modal-camp-owner' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Target Dana</span>
                  <span className="trans-detail-value">{formatUsdc(selectedCampaign.targetAmount).toFixed(2)} USDC</span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Terkumpul</span>
                  <span className="trans-detail-value" style={{ color: 'var(--success-400)' }}>
                    {formatUsdc(selectedCampaign.raisedAmount).toFixed(2)} USDC
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                      ({Math.min((formatUsdc(selectedCampaign.raisedAmount) / formatUsdc(selectedCampaign.targetAmount)) * 100, 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Total Donatur</span>
                  <span className="trans-detail-value">{Number(selectedCampaign.donorCount)} transaksi donasi aktif</span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Tenggat Waktu</span>
                  <span className="trans-detail-value">
                    {new Date(Number(selectedCampaign.deadline) * 1000).toLocaleString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                    {Number(selectedCampaign.deadline) * 1000 < Date.now() ? ' (Berakhir)' : ''}
                  </span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Status</span>
                  <span className="trans-detail-value">
                    <span className={`status-badge ${selectedCampaign.isActive && (Number(selectedCampaign.deadline) * 1000 > Date.now()) ? 'active' : 'inactive'}`}>
                      {selectedCampaign.isWithdrawn ? 'Dana Telah Ditarik' : selectedCampaign.isActive && (Number(selectedCampaign.deadline) * 1000 > Date.now()) ? '● Kampanye Aktif' : 'Kampanye Selesai'}
                    </span>
                  </span>
                </div>

                {/* Tx Hash */}
                {formatHash(selectedCampaign.txHash) && (
                  <div className="trans-detail-row" style={{ borderBottom: 'none' }}>
                    <span className="trans-detail-label">Tx Hash Pembuatan</span>
                    <div className="modal-addr-row">
                      <div className="modal-hash-box">
                        {explorerUrl ? (
                          <a href={getTxUrl(formatHash(selectedCampaign.txHash))} target="_blank" rel="noopener noreferrer" className="monospace modal-hash-text" style={{ color: 'var(--primary-400)', textDecoration: 'none' }} title={formatHash(selectedCampaign.txHash)}>
                            {formatHash(selectedCampaign.txHash)}
                          </a>
                        ) : (
                          <span className="monospace modal-hash-text" title={formatHash(selectedCampaign.txHash)}>
                            {formatHash(selectedCampaign.txHash)}
                          </span>
                        )}
                      </div>
                      <button
                        className="copy-tiny"
                        onClick={() => copyText(formatHash(selectedCampaign.txHash), 'modal-camp-hash')}
                        title="Salin hash"
                        style={{ flexShrink: 0 }}
                      >
                        {copiedHash === 'modal-camp-hash' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Detail Modal */}
      {selectedWithdrawal && (
        <div className="trans-modal-overlay" onClick={() => setSelectedWithdrawal(null)}>
          <div className="trans-modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="trans-modal-header">
              <h3>
                <ArrowUpRight size={16} className="text-warning-400" />
                Detail Penarikan #{selectedWithdrawal.id.toString()}
              </h3>
              <button className="trans-modal-close" onClick={() => setSelectedWithdrawal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="trans-modal-body">
              <div className="trans-detail-list">
                <div className="trans-detail-row">
                  <span className="trans-detail-label">Kampanye</span>
                  <span className="trans-detail-value">{selectedWithdrawal.campaignTitle} (ID: #{selectedWithdrawal.campaignId.toString()})</span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Penerima Dana</span>
                  <div className="modal-addr-row">
                    <span className="trans-detail-value monospace modal-addr-text" title={selectedWithdrawal.recipient}>
                      {selectedWithdrawal.recipient}
                    </span>
                    <button className="copy-tiny" onClick={() => copyText(selectedWithdrawal.recipient, 'modal-with-recp')} title="Salin address">
                      {copiedHash === 'modal-with-recp' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Jumlah Ditarik</span>
                  <span className="trans-detail-value" style={{ color: 'var(--warning-400)' }}>
                    {formatUsdc(selectedWithdrawal.amount).toFixed(2)} USDC
                  </span>
                </div>

                <div className="trans-detail-row">
                  <span className="trans-detail-label">Waktu Transaksi</span>
                  <span className="trans-detail-value">
                    {new Date(Number(selectedWithdrawal.timestamp) * 1000).toLocaleString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                </div>

                {/* Tx Hash */}
                {formatHash(selectedWithdrawal.txHash) && (
                  <div className="trans-detail-row" style={{ borderBottom: 'none' }}>
                    <span className="trans-detail-label">Tx Hash</span>
                    <div className="modal-addr-row">
                      <div className="modal-hash-box">
                        {explorerUrl ? (
                          <a href={getTxUrl(formatHash(selectedWithdrawal.txHash))} target="_blank" rel="noopener noreferrer" className="monospace modal-hash-text" style={{ color: 'var(--primary-400)', textDecoration: 'none' }} title={formatHash(selectedWithdrawal.txHash)}>
                            {formatHash(selectedWithdrawal.txHash)}
                          </a>
                        ) : (
                          <span className="monospace modal-hash-text" title={formatHash(selectedWithdrawal.txHash)}>
                            {formatHash(selectedWithdrawal.txHash)}
                          </span>
                        )}
                      </div>
                      <button
                        className="copy-tiny"
                        onClick={() => copyText(formatHash(selectedWithdrawal.txHash), 'modal-with-hash')}
                        title="Salin hash"
                        style={{ flexShrink: 0 }}
                      >
                        {copiedHash === 'modal-with-hash' ? <CheckCircle size={12} style={{ color: 'var(--success-400)' }} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="trans-detail-msg-box">
                <span className="trans-detail-msg-label">Tujuan Pencairan (Purpose):</span>
                <div className="trans-detail-msg-content">
                  {selectedWithdrawal.purpose ? (
                    <span className="trans-detail-msg-text">{selectedWithdrawal.purpose}</span>
                  ) : (
                    <span className="trans-detail-msg-text" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                      [Tidak ada keterangan tujuan]
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
