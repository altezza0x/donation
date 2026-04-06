import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { parseUsdc, formatUsdc } from '../contracts/MockUSDC';
import { CONTRACT_ADDRESS, DONATION_SYSTEM_ABI } from '../contracts/DonationSystem';
import { decodeEventLog, parseAbiItem } from 'viem';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { saveTxHash, getTxHash } from '../api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Clock, Users, Target, TrendingUp, CheckCircle,
  ExternalLink, Heart, AlertTriangle, Copy, RefreshCw, Wallet,
  Shield, User, X, AlertCircle
} from 'lucide-react';
import './CampaignDetailPage.css';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contract, readOnlyContract, usdcContract, account, user, isConnected, usdcAddress, provider, networkId } = useWeb3();

  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationLoading, setDonationLoading] = useState(false);
  const [creationTxHash, setCreationTxHash] = useState(null);
  const { openConnectModal } = useConnectModal();

  // Form state
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnon, setIsAnon] = useState(false);

  // Withdraw modal state
  const [withdrawModal, setWithdrawModal] = useState(false); // 'input' | 'confirm' | false
  const [withdrawPurpose, setWithdrawPurpose] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Pagination riwayat donasi
  const [donationPage, setDonationPage] = useState(1);
  const DONATIONS_PER_PAGE = 5;

  useEffect(() => {
    fetchData();
  }, [readOnlyContract, id]);

  const fetchData = async () => {
    if (!readOnlyContract || !id) {
      if (!readOnlyContract) setLoading(true); // Masih nunggu provider
      else setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [camp, dons] = await Promise.all([
        readOnlyContract.getCampaign(BigInt(id)),
        readOnlyContract.getCampaignDonations(BigInt(id)),
      ]);
      setCampaign(camp);
      setDonations([...dons].reverse());

      // Coba ambil dari localStorage (cache) dulu
      const cachedHash = localStorage.getItem(`camp-tx-${id}`);
      if (cachedHash) {
        setCreationTxHash(cachedHash);
      } else {
        // Coba dari MongoDB (berfungsi di semua perangkat)
        const dbHash = await getTxHash('campaign', id);
        if (dbHash) {
          setCreationTxHash(dbHash);
          localStorage.setItem(`camp-tx-${id}`, dbHash); // cache lokal
        } else if (provider) {
          // Last resort: query blockchain langsung dari blok 0
          try {
            const logs = await provider.getLogs({
              address: CONTRACT_ADDRESS,
              event: parseAbiItem('event CampaignCreated(uint256 indexed campaignId, address indexed owner, string title, uint256 targetAmount, uint256 deadline)'),
              args: { campaignId: BigInt(id) },
              fromBlock: 0n,
            }).catch(() => []);

            if (logs && logs.length > 0) {
              const hash = logs[0].transactionHash;
              setCreationTxHash(hash);
              localStorage.setItem(`camp-tx-${id}`, hash);
              saveTxHash('campaign', id, hash); // simpan ke MongoDB
            }
          } catch (e) {
            console.warn('Gagal mengambil tx hash pembuatan kampanye:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching campaign detail:', err);
      toast.error('Kampanye tidak ditemukan');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!isConnected) { toast.error('Hubungkan wallet MetaMask terlebih dahulu!'); return; }
    if (!user?.isRegistered) { toast.error('Daftar akun terlebih dahulu!'); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Masukkan jumlah donasi yang valid'); return; }

    setDonationLoading(true);
    const toastId = toast.loading('Menyetujui penggunaan USDC...');

    try {
      const amountUsdc = parseUsdc(amount);
      const name = isAnon ? 'Anonim' : (user?.name || 'Anonim');

      // Step 1: Approve USDC ke DonationSystem contract
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, amountUsdc);
      toast.loading('Menunggu konfirmasi approve...', { id: toastId });
      await approveTx.wait();

      // Step 2: Donate
      toast.loading('Memproses donasi di blockchain...', { id: toastId });
      const tx = await contract.donate(BigInt(id), name, message, amountUsdc);
      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });

      const receipt = await tx.wait();

      // Simpan hash asli ke local storage agar terbaca di Transparansi
      try {
        if (receipt && receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: DONATION_SYSTEM_ABI,
                data: log.data,
                topics: log.topics,
              });
              if (decoded.eventName === 'DonationMade') {
                const donationId = decoded.args.donationId.toString();
                localStorage.setItem(`don-tx-${donationId}`, tx.hash);
                // Simpan ke MongoDB agar bisa dibaca dari semua perangkat
                saveTxHash('donation', donationId, tx.hash);
              }
            } catch (e) {
              // Ignore logs that belong to other contracts (like USDC)
            }
          }
        }
      } catch (e) {
        console.error("Gagal parse logs", e);
      }

      toast.custom((t) => (
        <div style={{
          opacity: t.visible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.15)', minWidth: '300px', pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <CheckCircle size={22} style={{ color: '#34d399' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Donasi Berhasil!</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>Transaksi dikonfirmasi on-chain</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Jumlah Dikirim</span>
            <strong style={{ color: '#10b981', fontSize: '15px' }}>{amount} USDC</strong>
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', textDecoration: 'none',
              padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, transition: 'background 0.2s'
            }}
          >
            Detail <ExternalLink size={14} />
          </a>
        </div>
      ), { id: toastId, duration: 8000 });

      setAmount('');
      setMessage('');
      await fetchData();
    } catch (err) {
      const msg = err.reason || err.message || 'Transaksi gagal';
      const safeMsg = msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
      toast.custom((t) => (
        <div style={{
          opacity: t.visible ? 1 : 0, transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: t.visible ? 'scale(1)' : 'scale(0.95)',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 20px 40px -10px rgba(239, 68, 68, 0.15)', minWidth: '300px', pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <AlertTriangle size={22} style={{ color: '#f87171' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Donasi Gagal</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171', marginTop: '2px' }}>Reverted by blockchain</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #ef4444' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>{safeMsg}</span>
          </div>
        </div>
      ), { id: toastId, duration: 8000 });
      console.error(err);
    } finally {
      setDonationLoading(false);
    }
  };

  const handleWithdrawOpen = () => {
    setWithdrawPurpose('');
    setWithdrawModal('input');
  };

  const handleWithdrawConfirm = () => {
    if (!withdrawPurpose.trim()) {
      toast.error('Tujuan penarikan tidak boleh kosong!');
      return;
    }
    setWithdrawModal('confirm');
  };

  const handleWithdrawExecute = async () => {
    setWithdrawLoading(true);
    const toastId = toast.loading('Memproses penarikan...');
    try {
      const tx = await contract.withdrawFunds(BigInt(id), withdrawPurpose);
      const receipt = await tx.wait();

      // Simpan hash asli ke local storage agar terbaca di Transparansi
      try {
        if (receipt && receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: DONATION_SYSTEM_ABI,
                data: log.data,
                topics: log.topics,
              });
              if (decoded.eventName === 'FundsWithdrawn') {
                const cId = decoded.args.campaignId.toString();
                const ts = decoded.args.timestamp.toString();
                localStorage.setItem(`wit-tx-${cId}-${ts}`, tx.hash);
                // Simpan ke MongoDB agar bisa dibaca dari semua perangkat
                saveTxHash('withdrawal', `${cId}-${ts}`, tx.hash);
              }
            } catch (e) {
              // Abaikan
            }
          }
        }
      } catch (e) {
        console.error("Gagal parse logs penarikan", e);
      }

      toast.custom((t) => (
        <div style={{
          opacity: t.visible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.15)', minWidth: '300px', pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <Wallet size={22} style={{ color: '#34d399' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Penarikan Sukses!</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>Dana ditransfer ke wallet</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Total Cair</span>
            <strong style={{ color: '#10b981', fontSize: '15px' }}>{raised.toFixed(2)} USDC</strong>
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', textDecoration: 'none',
              padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, transition: 'background 0.2s'
            }}
          >
            Detail <ExternalLink size={14} />
          </a>
        </div>
      ), { id: toastId, duration: 8000 });
      setWithdrawModal(false);
      setWithdrawPurpose('');
      await fetchData();
    } catch (err) {
      const msg = err.reason || err.message || 'Gagal menarik dana';
      const safeMsg = msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
      toast.custom((t) => (
        <div style={{
          opacity: t.visible ? 1 : 0, transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: t.visible ? 'scale(1)' : 'scale(0.95)',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 20px 40px -10px rgba(239, 68, 68, 0.15)', minWidth: '300px', pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <AlertTriangle size={22} style={{ color: '#f87171' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Penarikan Gagal</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171', marginTop: '2px' }}>Reverted by blockchain</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #ef4444' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>{safeMsg}</span>
          </div>
        </div>
      ), { id: toastId, duration: 8000 });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    toast.success('Address disalin!');
  };

  if (loading || !campaign) {
    return (
      <div className="detail-loading">
        <div className="detail-loading-inner">
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p>{!readOnlyContract ? 'Menghubungkan ke blockchain...' : 'Memuat data kampanye...'}</p>
        </div>
      </div>
    );
  }

  const target = formatUsdc(campaign.targetAmount);
  const raised = formatUsdc(campaign.raisedAmount);
  const progress = Math.min((raised / target) * 100, 100);
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const daysLeft = Math.max(0, Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24)));
  const isExpired = deadline < new Date();
  const isOwner = account?.toLowerCase() === campaign.owner?.toLowerCase();
  const canWithdraw = isOwner && !campaign.isWithdrawn && raised > 0 && (isExpired || raised >= target);

  const EMOJI_MAP = {
    Pendidikan: '🎓', Kesehatan: '🏥', 'Bencana Alam': '🆘',
    Keagamaan: '🕌', Sosial: '🤝', Lainnya: '💡',
  };

  return (
    <div className="detail-page">

      {/* ===== WITHDRAW MODAL ===== */}
      {withdrawModal && (
        <div className="withdraw-modal-overlay" onClick={() => !withdrawLoading && setWithdrawModal(false)}>
          <div className="withdraw-modal" onClick={e => e.stopPropagation()}>

            {/* Step 1: Input purpose */}
            {withdrawModal === 'input' && (
              <>
                <div className="wm-header">
                  <div className="wm-icon-wrap">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <h3 className="wm-title">Penarikan Dana</h3>
                    <p className="wm-subtitle">Langkah 1 dari 2 — Isi tujuan penggunaan</p>
                  </div>
                  <button className="wm-close" onClick={() => setWithdrawModal(false)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Step indicator */}
                <div className="wm-steps">
                  <div className="wm-step active">
                    <div className="wm-step-dot">1</div>
                    <span>Tujuan</span>
                  </div>
                  <div className="wm-step-line" />
                  <div className="wm-step">
                    <div className="wm-step-dot">2</div>
                    <span>Konfirmasi</span>
                  </div>
                </div>

                <div className="wm-body">
                  {/* Campaign summary */}
                  <div className="wm-campaign-summary">
                    <div className="wm-summary-row">
                      <span className="wm-summary-label">Kampanye</span>
                      <span className="wm-summary-val">{campaign.title}</span>
                    </div>
                    <div className="wm-summary-row">
                      <span className="wm-summary-label">Dana Terkumpul</span>
                      <span className="wm-summary-val success">{raised.toFixed(2)} USDC</span>
                    </div>
                    <div className="wm-summary-row">
                      <span className="wm-summary-label">Penerima</span>
                      <span className="wm-summary-val monospace wm-addr-small">
                        {(campaign.beneficiary || campaign.owner).slice(0, 10)}...{(campaign.beneficiary || campaign.owner).slice(-8)}
                      </span>
                    </div>
                  </div>

                  <div className="wm-info-box">
                    <AlertCircle size={14} />
                    <span>Tujuan penggunaan dana akan dicatat <strong>permanen di blockchain</strong>. Mohon isi dengan jujur dan detail.</span>
                  </div>

                  <div className="wm-form-group">
                    <label className="wm-label">Tujuan Penggunaan Dana *</label>
                    <textarea
                      className="wm-textarea"
                      rows={4}
                      placeholder="Contoh: Dana akan digunakan untuk membeli perlengkapan belajar bagi 30 siswa di desa..."
                      value={withdrawPurpose}
                      onChange={e => setWithdrawPurpose(e.target.value)}
                      autoFocus
                    />
                    <span className="wm-char-count">{withdrawPurpose.length} karakter</span>
                  </div>
                </div>

                <div className="wm-footer">
                  <button className="wm-btn-cancel" onClick={() => setWithdrawModal(false)}>Batal</button>
                  <button
                    className="wm-btn-next"
                    onClick={handleWithdrawConfirm}
                    disabled={!withdrawPurpose.trim()}
                  >
                    Lanjut &rarr;
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Confirm */}
            {withdrawModal === 'confirm' && (
              <>
                <div className="wm-header">
                  <div className="wm-icon-wrap warning">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="wm-title">Konfirmasi Penarikan</h3>
                    <p className="wm-subtitle">Langkah 2 dari 2 — Tindakan ini tidak dapat dibatalkan</p>
                  </div>
                  <button className="wm-close" onClick={() => !withdrawLoading && setWithdrawModal(false)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Step indicator */}
                <div className="wm-steps">
                  <div className="wm-step done">
                    <div className="wm-step-dot">✓</div>
                    <span>Tujuan</span>
                  </div>
                  <div className="wm-step-line done" />
                  <div className="wm-step active">
                    <div className="wm-step-dot">2</div>
                    <span>Konfirmasi</span>
                  </div>
                </div>

                <div className="wm-body">
                  {/* Amount hero */}
                  <div className="wm-amount-hero">
                    <p className="wm-amount-label">Jumlah yang akan ditarik</p>
                    <p className="wm-amount-big">{raised.toFixed(2)} <span>USDC</span></p>
                  </div>

                  {/* Detail grid */}
                  <div className="wm-detail-grid">
                    <div className="wm-detail-item">
                      <span className="wm-detail-label">Kampanye</span>
                      <span className="wm-detail-val">{campaign.title}</span>
                    </div>
                    <div className="wm-detail-item">
                      <span className="wm-detail-label">ID Kampanye</span>
                      <span className="wm-detail-val monospace">#{campaign.id?.toString()}</span>
                    </div>
                    <div className="wm-detail-item full">
                      <span className="wm-detail-label">Address Penerima Dana</span>
                      <div className="wm-detail-addr">
                        <span className="monospace">{campaign.beneficiary || campaign.owner}</span>
                        <button
                          className="wm-copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(campaign.beneficiary || campaign.owner);
                            import('react-hot-toast').then(({ default: toast }) => toast.success('Address disalin!'));
                          }}
                          title="Salin address"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="wm-detail-item full">
                      <span className="wm-detail-label">Tujuan Penggunaan Dana</span>
                      <p className="wm-detail-purpose">{withdrawPurpose}</p>
                    </div>
                  </div>

                  <div className="wm-warning-box">
                    <AlertTriangle size={13} />
                    <span>Pastikan semua informasi sudah benar. Transaksi blockchain bersifat <strong>permanen dan tidak bisa diubah</strong> setelah dikonfirmasi.</span>
                  </div>
                </div>

                <div className="wm-footer">
                  <button className="wm-btn-cancel" onClick={() => setWithdrawModal('input')} disabled={withdrawLoading}>
                    &larr; Kembali
                  </button>
                  <button
                    className="wm-btn-execute"
                    onClick={handleWithdrawExecute}
                    disabled={withdrawLoading}
                  >
                    {withdrawLoading ? (
                      <><div className="spinner" style={{ width: 15, height: 15 }} /> Memproses...</>
                    ) : (
                      <><Wallet size={15} /> Tarik Dana Sekarang</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="container">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="detail-layout">
          {/* LEFT: Campaign Info */}
          <div className="detail-main">
            {/* Thumbnail */}
            <div
              className="detail-thumbnail"
              style={campaign.imageUrl ? { backgroundImage: `url(${campaign.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!campaign.imageUrl && <span className="detail-emoji">{EMOJI_MAP[campaign.category] || '💡'}</span>}
            </div>

            {/* Badges below image */}
            <div className="detail-badges-row">
              <span className="detail-category-badge">{campaign.category}</span>
              {(!campaign.isActive || isExpired) && (
                <span className="detail-closed-badge">Kampanye Selesai</span>
              )}
            </div>

            {/* Title & desc */}
            <h1 className="detail-title">{campaign.title}</h1>
            <p className="detail-desc">{campaign.description}</p>

            {/* Campaign meta */}
            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <p className="meta-label">Target</p>
                <p className="meta-value">{target.toFixed(2)} USDC</p>
              </div>
              <div className="detail-meta-item">
                <p className="meta-label">Terkumpul</p>
                <p className="meta-value success">{raised.toFixed(2)} USDC</p>
              </div>
              <div className="detail-meta-item">
                <p className="meta-label">Donatur</p>
                <p className="meta-value">{Number(campaign.donorCount)}</p>
              </div>
              <div className="detail-meta-item">
                <p className="meta-label">Deadline</p>
                <p className={`meta-value ${isExpired ? 'danger' : ''}`}>
                  {isExpired ? 'Berakhir' : `${daysLeft} hari lagi`}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="detail-progress">
              <div className="detail-progress-header">
                <span className="progress-pct-text">{progress.toFixed(1)}% Tercapai</span>
                <span className="progress-raised-text">{raised.toFixed(2)} / {target.toFixed(2)} USDC</span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Blockchain info */}
            <div className="blockchain-info glass-card">
              <h3 className="blockchain-info-title">
                <Shield size={16} /> Info Blockchain
              </h3>
              <div className="blockchain-info-items">
                <div className="bc-item">
                  <span className="bc-label">Smart Contract ID</span>
                  <span className="bc-value monospace">#{campaign.id.toString()}</span>
                </div>
                <div className="bc-item">
                  <span className="bc-label">Pemilik Kampanye</span>
                  <span className="bc-value monospace short-addr">
                    {campaign.owner.slice(0, 10)}...{campaign.owner.slice(-6)}
                    <button className="copy-btn" onClick={() => copyAddress(campaign.owner)}>
                      <Copy size={11} />
                    </button>
                  </span>
                </div>
                {campaign.beneficiary && (
                  <div className="bc-item">
                    <span className="bc-label">Penerima Dana</span>
                    <span className="bc-value monospace short-addr">
                      {campaign.beneficiary.slice(0, 10)}...{campaign.beneficiary.slice(-6)}
                      <button className="copy-btn" onClick={() => copyAddress(campaign.beneficiary)}>
                        <Copy size={11} />
                      </button>
                    </span>
                  </div>
                )}
                <div className="bc-item">
                  <span className="bc-label">Token Pembayaran</span>
                  <span className="bc-value monospace short-addr" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>USDC · {usdcAddress ? `${usdcAddress.slice(0, 10)}...${usdcAddress.slice(-6)}` : '-'}</span>
                    {usdcAddress && (
                      <button className="copy-btn" onClick={() => copyAddress(usdcAddress)}>
                        <Copy size={11} />
                      </button>
                    )}
                  </span>
                </div>
                <div className="bc-item">
                  <span className="bc-label">Dibuat Pada</span>
                  <span className="bc-value">{new Date(Number(campaign.createdAt) * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                {creationTxHash && (
                  <div className="bc-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    <span className="bc-label">Tx Hash Pembuatan</span>
                    <a href={`https://sepolia.etherscan.io/tx/${creationTxHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="bc-value monospace short-addr"
                      style={{ color: 'var(--primary-400)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {creationTxHash.slice(0, 14)}...{creationTxHash.slice(-10)}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
                <div className="bc-item">
                  <span className="bc-label">Status Dana</span>
                  <span className={`bc-badge ${campaign.isWithdrawn ? 'warning' : 'success'}`}>
                    {campaign.isWithdrawn ? 'Dana Ditarik' : 'Dana di Contract'}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner withdraw */}
            {canWithdraw && (
              <div className="withdraw-panel">
                <div className="withdraw-info">
                  <CheckCircle size={20} style={{ color: 'var(--success-400)' }} />
                  <div>
                    <p className="withdraw-title">Dana Siap Ditarik</p>
                    <p className="withdraw-amount">{raised.toFixed(2)} USDC</p>
                  </div>
                </div>
                <button className="withdraw-btn" onClick={handleWithdrawOpen}>
                  <Wallet size={16} />
                  Tarik Dana
                </button>
              </div>
            )}

          </div>

          {/* RIGHT: Donate Form */}
          <div className="detail-sidebar">
            <div className="donate-card glass-card">
              <h2 className="donate-title">
                <Heart size={18} /> Berikan Donasi
              </h2>

              {!isConnected ? (
                <div className="donate-connect-notice">
                  <Wallet size={32} style={{ color: 'var(--primary-400)', opacity: 0.7 }} />
                  <p>Hubungkan Wallet Anda Untuk Berdonasi</p>
                  {openConnectModal && (
                    <button
                      type="button"
                      className="gate-btn"
                      onClick={openConnectModal}
                      style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      Hubungkan Wallet
                    </button>
                  )}
                </div>
              ) : !user?.isRegistered ? (
                <div className="donate-connect-notice">
                  <Shield size={32} style={{ color: 'var(--warning-400)', opacity: 0.8 }} />
                  <p>Anda harus mendaftar akun terlebih dahulu sebelum berdonasi.</p>
                  <button
                    className="gate-btn"
                    onClick={() => navigate('/register')}
                    style={{ marginTop: 12 }}
                  >
                    Daftar Sekarang
                  </button>
                </div>
              ) : !campaign.isActive || isExpired ? (
                <div className="donate-closed">
                  <AlertTriangle size={32} style={{ color: 'var(--warning-400)' }} />
                  <p>Kampanye ini sudah berakhir</p>
                </div>
              ) : (
                <form onSubmit={handleDonate} className="donate-form">
                  {/* Amount */}
                  <div className="form-group">
                    <label className="form-label">Jumlah Donasi (USDC) *</label>
                    <div className="amount-input-wrapper">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="10"
                        className="form-input"
                        required
                      />
                      <span className="amount-suffix">USDC</span>
                    </div>
                    {/* Quick amounts */}
                    <div className="quick-amounts">
                      {['10', '50', '100', '500'].map(q => (
                        <button key={q} type="button" className="quick-amount" onClick={() => setAmount(q)}>
                          {q} USDC
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nama — dari profil, tidak bisa diubah di sini */}
                  <div className="form-group">
                    <label className="form-label">Nama Donatur</label>
                    <input
                      type="text"
                      value={isAnon ? 'Anonim' : (user?.name || '')}
                      className="form-input"
                      disabled
                      style={{ opacity: isAnon ? 0.5 : 0.8, cursor: 'not-allowed' }}
                    />
                    {!isAnon && (
                      <span className="form-hint" style={{ fontSize: 11 }}>
                        Nama diambil dari profil Anda.{' '}
                        <a href="/profile" style={{ color: 'var(--primary-400)' }}>Ubah di Profil</a>
                      </span>
                    )}
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={isAnon}
                        onChange={e => setIsAnon(e.target.checked)}
                      />
                      Donasi Anonim
                    </label>
                  </div>

                  {/* Message */}
                  <div className="form-group">
                    <label className="form-label">Pesan (opsional)</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Semoga bermanfaat..."
                      className="form-textarea"
                      rows={3}
                    />
                  </div>

                  {/* Info */}
                  <div className="donate-info-box">
                    <Shield size={13} />
                    <span>Donasi menggunakan <strong>Mock USDC</strong>. Proses: approve → transfer via smart contract.</span>
                  </div>

                  <button type="submit" className="donate-submit" disabled={donationLoading}>
                    {donationLoading ? (
                      <>
                        <div className="spinner" style={{ width: 16, height: 16 }} />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Heart size={16} />
                        Donasi {amount ? `${amount} USDC` : 'Sekarang'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Campaign owner info */}
            {isOwner && (
              <div className="owner-notice glass-card">
                <User size={14} />
                <span>Anda adalah <strong>pemilik kampanye</strong> ini</span>
              </div>
            )}
          </div>
        </div>

        {/* Riwayat Donasi — full width, di bawah layout utama */}
        <div className="donations-list">
          <div className="donations-title-row">
            <h3 className="donations-title">
              <Heart size={16} /> Riwayat Donasi
            </h3>
            <span className="donations-count-badge">{donations.length} donasi</span>
          </div>

          {donations.length === 0 ? (
            <div className="no-donations">
              <Heart size={32} style={{ opacity: 0.3 }} />
              <p>Belum ada donasi. Jadilah yang pertama!</p>
            </div>
          ) : (() => {
            const totalPages = Math.ceil(donations.length / DONATIONS_PER_PAGE);
            const start = (donationPage - 1) * DONATIONS_PER_PAGE;
            const paginated = donations.slice(start, start + DONATIONS_PER_PAGE);
            return (
              <>
                {/* Info range */}
                <p className="donations-range">
                  Menampilkan {start + 1}–{Math.min(start + DONATIONS_PER_PAGE, donations.length)} dari {donations.length} donasi
                </p>

                <div className="donation-items">
                  {paginated.map((d, i) => (
                    <div key={i} className="donation-item">
                      <div className="donation-avatar">
                        {(d.donorName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div className="donation-main">
                        <div className="donation-header">
                          <span className="donation-name">{d.donorName || 'Anonim'}</span>
                          <span className="donation-amount">+{formatUsdc(d.amount).toFixed(2)} USDC</span>
                        </div>
                        {d.message && <p className="donation-message">"{d.message}"</p>}
                        <div className="donation-footer">
                          <span className="donation-addr monospace">
                            {d.donor.slice(0, 8)}...{d.donor.slice(-6)}
                          </span>
                          <span className="donation-time">
                            {new Date(Number(d.timestamp) * 1000).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="donations-pagination">
                    <button
                      className="dpag-btn"
                      onClick={() => setDonationPage(p => Math.max(1, p - 1))}
                      disabled={donationPage === 1}
                    >
                      Sebelumnya
                    </button>

                    <div className="dpag-pages">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                        <button
                          key={pg}
                          className={`dpag-page ${donationPage === pg ? 'active' : ''}`}
                          onClick={() => setDonationPage(pg)}
                        >
                          {pg}
                        </button>
                      ))}
                    </div>

                    <button
                      className="dpag-btn"
                      onClick={() => setDonationPage(p => Math.min(totalPages, p + 1))}
                      disabled={donationPage === totalPages}
                    >
                      Berikutnya
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
