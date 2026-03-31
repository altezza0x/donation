import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { formatEther, parseEther } from 'viem';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Clock, Users, Target, TrendingUp, CheckCircle,
  ExternalLink, Heart, AlertTriangle, Copy, RefreshCw, Wallet,
  Shield, User
} from 'lucide-react';
import './CampaignDetailPage.css';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contract, account, user, isConnected } = useWeb3();

  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationLoading, setDonationLoading] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnon, setIsAnon] = useState(false);

  useEffect(() => {
    fetchData();
  }, [contract, id]);

  const fetchData = async () => {
    if (!contract || !id) { setLoading(false); return; }
    try {
      const [camp, dons] = await Promise.all([
        contract.getCampaign(BigInt(id)),
        contract.getCampaignDonations(BigInt(id)),
      ]);
      setCampaign(camp);
      setDonations([...dons].reverse());
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
    const toastId = toast.loading('Memproses transaksi di blockchain...');

    try {
      const amountWei = parseEther(amount);
      const name = isAnon ? 'Anonim' : (user?.name || 'Anonim');

      const tx = await contract.donate(BigInt(id), name, message, { value: amountWei });
      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });

      await tx.wait();
      toast.success(`✅ Donasi ${amount} ETH berhasil! Hash: ${tx.hash.slice(0, 10)}...`, { id: toastId, duration: 6000 });

      setAmount('');
      setMessage('');
      await fetchData();
    } catch (err) {
      const msg = err.reason || err.message || 'Transaksi gagal';
      toast.error(msg.length > 80 ? msg.slice(0, 80) + '...' : msg, { id: toastId });
      console.error(err);
    } finally {
      setDonationLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Tarik dana kampanye ke wallet Anda?')) return;
    const toastId = toast.loading('Memproses penarikan...');
    try {
      const tx = await contract.withdrawFunds(BigInt(id));
      await tx.wait();
      toast.success('Dana berhasil ditarik!', { id: toastId });
      await fetchData();
    } catch (err) {
      toast.error(err.reason || 'Gagal menarik dana', { id: toastId });
    }
  };

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    toast.success('Address disalin!');
  };

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="detail-loading-inner">
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p>Memuat data dari blockchain...</p>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const target = Number(formatEther(campaign.targetAmount));
  const raised = Number(formatEther(campaign.raisedAmount));
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
              <div className="detail-category-badge">{campaign.category}</div>
              {(!campaign.isActive || isExpired) && (
                <div className="detail-closed-badge">Kampanye Selesai</div>
              )}
            </div>

            {/* Title & desc */}
            <h1 className="detail-title">{campaign.title}</h1>
            <p className="detail-desc">{campaign.description}</p>

            {/* Campaign meta */}
            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <Target size={14} className="meta-icon" />
                <div>
                  <p className="meta-label">Target</p>
                  <p className="meta-value">{target.toFixed(4)} ETH</p>
                </div>
              </div>
              <div className="detail-meta-item">
                <TrendingUp size={14} className="meta-icon success" />
                <div>
                  <p className="meta-label">Terkumpul</p>
                  <p className="meta-value success">{raised.toFixed(4)} ETH</p>
                </div>
              </div>
              <div className="detail-meta-item">
                <Users size={14} className="meta-icon" />
                <div>
                  <p className="meta-label">Donatur</p>
                  <p className="meta-value">{Number(campaign.donorCount)}</p>
                </div>
              </div>
              <div className="detail-meta-item">
                <Clock size={14} className={`meta-icon ${isExpired ? 'danger' : ''}`} />
                <div>
                  <p className="meta-label">Deadline</p>
                  <p className={`meta-value ${isExpired ? 'danger' : ''}`}>
                    {isExpired ? 'Berakhir' : `${daysLeft} hari lagi`}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="detail-progress">
              <div className="detail-progress-header">
                <span className="progress-pct-text">{progress.toFixed(1)}% Tercapai</span>
                <span className="progress-raised-text">{raised.toFixed(4)} / {target.toFixed(4)} ETH</span>
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
                <div className="bc-item">
                  <span className="bc-label">Dibuat Pada</span>
                  <span className="bc-value">{new Date(Number(campaign.createdAt) * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
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
                    <p className="withdraw-amount">{raised.toFixed(4)} ETH</p>
                  </div>
                </div>
                <button className="withdraw-btn" onClick={handleWithdraw}>
                  <Wallet size={16} />
                  Tarik Dana
                </button>
              </div>
            )}

            {/* Donations list */}
            <div className="donations-list">
              <h3 className="donations-title">
                <Heart size={16} /> Riwayat Donasi Blockchain ({donations.length})
              </h3>
              {donations.length === 0 ? (
                <div className="no-donations">
                  <Heart size={32} style={{ opacity: 0.3 }} />
                  <p>Belum ada donasi. Jadilah yang pertama!</p>
                </div>
              ) : (
                <div className="donation-items">
                  {donations.map((d, i) => (
                    <div key={i} className="donation-item">
                      <div className="donation-avatar">
                        {(d.donorName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div className="donation-main">
                        <div className="donation-header">
                          <span className="donation-name">{d.donorName || 'Anonim'}</span>
                          <span className="donation-amount">+{Number(formatEther(d.amount)).toFixed(4)} ETH</span>
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
              )}
            </div>
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
                  <p>Hubungkan MetaMask untuk berdonasi</p>
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
                    <label className="form-label">Jumlah Donasi (ETH) *</label>
                    <div className="amount-input-wrapper">
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.1"
                        className="form-input"
                        required
                      />
                      <span className="amount-suffix">ETH</span>
                    </div>
                    {/* Quick amounts */}
                    <div className="quick-amounts">
                      {['0.01', '0.05', '0.1', '0.5'].map(q => (
                        <button key={q} type="button" className="quick-amount" onClick={() => setAmount(q)}>
                          {q} ETH
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
                    <span>Transaksi diproses oleh smart contract dan dicatat permanen di blockchain Ethereum</span>
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
                        Donasi {amount ? `${amount} ETH` : 'Sekarang'}
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
      </div>
    </div>
  );
}
