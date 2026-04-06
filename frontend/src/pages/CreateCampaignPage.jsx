import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { parseUsdc } from '../contracts/MockUSDC';
import { DONATION_SYSTEM_ABI } from '../contracts/DonationSystem';
import { decodeEventLog } from 'viem';
import { saveTxHash, API_BASE } from '../api';
import toast from 'react-hot-toast';
import { PlusCircle, Wallet, Info, Calendar, Target, Tag, FileText, Zap, Upload, CheckCircle, AlertCircle, X, ExternalLink } from 'lucide-react';
import './CreateCampaignPage.css';

const CATEGORIES = ['Pendidikan', 'Kesehatan', 'Bencana Alam', 'Keagamaan', 'Sosial', 'Lainnya'];
const CATEGORY_EMOJIS = {
  Pendidikan: '🎓', Kesehatan: '🏥', 'Bencana Alam': '🆘',
  Keagamaan: '🕌', Sosial: '🤝', Lainnya: '💡',
};

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const { contract, isConnected, user, isVerifiedCreator } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadAbortController, setUploadAbortController] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Pendidikan',
    targetAmount: '',
    durationDays: '30',
    imageUrl: '',
    beneficiary: '',
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format gambar harus JPG, PNG, WEBP, atau GIF');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 2MB');
      return;
    }

    if (uploadAbortController) {
      uploadAbortController.abort();
    }
    const controller = new AbortController();
    setUploadAbortController(controller);

    setUploadingImage(true);
    const toastId = toast.loading('Mengunggah gambar...');

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsDataURL(file);
      });

      const ext = '.' + file.name.split('.').pop();
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, ext }),
        signal: controller.signal
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server tidak merespons (Mungkin backend mati)');
      }

      const data = await res.json();
      setForm(prev => ({ ...prev, imageUrl: data.url }));
      toast.success('Gambar berhasil diunggah!', { id: toastId });
      
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.error('Upload dibatalkan', { id: toastId });
      } else {
        toast.error(error.message || 'Gagal mengunggah gambar', { id: toastId });
      }
      console.error(error);
    } finally {
      setUploadingImage(false);
      setUploadAbortController(null);
      // Reset input supaya bisa upload file yang sama lagi jika batal
      e.target.value = null;
    }
  };

  const handleCancelUpload = (e) => {
    e.preventDefault();
    if (uploadAbortController) {
      uploadAbortController.abort();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) { toast.error('Hubungkan wallet MetaMask!'); return; }
    if (!user?.isRegistered) { toast.error('Daftar akun terlebih dahulu!'); return; }
    if (!form.title.trim()) { toast.error('Judul tidak boleh kosong'); return; }
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) { toast.error('Target donasi harus > 0'); return; }
    if (!form.durationDays || parseInt(form.durationDays) < 1) { toast.error('Durasi minimal 1 hari'); return; }
    if (!form.beneficiary || !/^0x[a-fA-F0-9]{40}$/.test(form.beneficiary)) { toast.error('Format alamat penerima dana (beneficiary) tidak valid'); return; }

    setLoading(true);
    const toastId = toast.loading('Membuat kampanye di blockchain...');

    try {
      const targetWei = parseUsdc(form.targetAmount.toString());
      const duration = parseInt(form.durationDays);

      const tx = await contract.createCampaign(
        form.title,
        form.description,
        form.category,
        form.imageUrl,
        targetWei,
        duration,
        form.beneficiary
      );

      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });
      const receipt = await tx.wait();

      let newCampaignId = null;
      try {
        if (receipt && receipt.logs) {
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: DONATION_SYSTEM_ABI,
                data: log.data,
                topics: log.topics,
              });
              if (decoded.eventName === 'CampaignCreated') {
                newCampaignId = decoded.args.campaignId.toString();
                localStorage.setItem(`camp-tx-${newCampaignId}`, tx.hash);
                // Simpan ke MongoDB agar bisa dibaca dari semua perangkat
                saveTxHash('campaign', newCampaignId, tx.hash);
              }
            } catch (e) { }
          }
        }
      } catch (e) { }

      toast.custom((t) => (
        <div style={{
          opacity: t.visible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.15)', minWidth: '320px', pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <CheckCircle size={22} style={{ color: '#34d399' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Kampanye Dibuat!</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>Tersimpan di blockchain</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>ID Kampanye</span>
            <strong style={{ color: '#10b981', fontSize: '14px' }}>{newCampaignId ? `#${newCampaignId}` : '-'}</strong>
            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Target Dana</span>
            <strong style={{ color: '#10b981', fontSize: '14px' }}>{form.targetAmount} USDC</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (newCampaignId) {
                  const url = `${window.location.origin}/campaigns/${newCampaignId}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Alamat kampanye disalin!');
                }
              }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: 'none', cursor: 'pointer',
                padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, transition: 'background 0.2s'
              }}
            >
              Salin URL
            </button>
            <a
              href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', textDecoration: 'none',
                padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, transition: 'background 0.2s'
              }}
            >
              Tx Explorer <ExternalLink size={14} />
            </a>
          </div>
        </div>
      ), { id: toastId, duration: 8000 });

      // Navigate ke halaman detail kampanye jika ID berhasil didapat
      if (newCampaignId) {
        navigate(`/campaigns/${newCampaignId}`);
      } else {
        navigate('/campaigns');
      }
    } catch (err) {
      const msg = err.reason || err.message || 'Gagal membuat kampanye';
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
              <AlertCircle size={22} style={{ color: '#f87171' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Gagal Dibuat</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171', marginTop: '2px' }}>Transaksi blockchain gagal</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #ef4444' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>{msg.slice(0, 100)}</span>
          </div>
        </div>
      ), { id: toastId, duration: 8000 });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="create-page">
        <div className="container">
          <div className="create-gate">
            <div className="gate-icon"><Wallet size={40} /></div>
            <h2>Hubungkan Wallet Dulu</h2>
            <p>Anda perlu menghubungkan MetaMask untuk membuat kampanye donasi.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.isRegistered) {
    return (
      <div className="create-page">
        <div className="container">
          <div className="create-gate">
            <div className="gate-icon"><Info size={40} /></div>
            <h2>Daftar Akun Dulu</h2>
            <p>Anda perlu mendaftar akun sebelum dapat membuat kampanye.</p>
            <button onClick={() => navigate('/register')} className="gate-btn">
              Daftar Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isVerifiedCreator) {
    return (
      <div className="create-page">
        <div className="not-whitelisted-wrapper">
          <div className="not-whitelisted-card">
            {/* Text */}
            <div className="nw-text">
              <h2 className="nw-title">Not Whitelisted</h2>
              <p className="nw-subtitle">
                Wallet Anda tidak terdaftar sebagai <span className="nw-highlight">Verified Creator</span>.
              </p>
              <p className="nw-desc">
                Platform hanya mengizinkan penggalangan dana oleh akun yang telah melewati verifikasi KYC oleh administrator. Silakan hubungi admin untuk informasi lebih lanjut.
              </p>
            </div>

            {/* Actions */}
            <div className="nw-actions">
              <button className="nw-btn-home" onClick={() => navigate('/')}>
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const preview = {
    emoji: CATEGORY_EMOJIS[form.category] || '💡',
    deadline: new Date(Date.now() + parseInt(form.durationDays || 30) * 24 * 60 * 60 * 1000)
      .toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
  };

  return (
    <div className="create-page">
      <div className="create-header">
        <div className="create-header-bg" />
        <div className="container">
          <span className="section-tag">Buat Kampanye</span>
          <h1 className="create-page-title">
            Mulai <span className="gradient-text">Kampanye Donasi</span> Anda
          </h1>
          <p className="create-page-desc">
            Kampanye Anda akan tercatat di blockchain Ethereum secara transparan dan tidak dapat dimanipulasi.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="create-layout">
          {/* Form */}
          <form onSubmit={handleSubmit} className="create-form">
            <div className="form-section">
              <h3 className="form-section-title">
                <FileText size={16} /> Informasi Kampanye
              </h3>

              <div className="form-group">
                <label className="form-label">Judul Kampanye *</label>
                <input
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Contoh: Beasiswa Anak Yatim Piatu 2025"
                  className="form-input"
                  maxLength={100}
                  required
                />
                <span className="form-hint">{form.title.length}/100 karakter</span>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Jelaskan tujuan kampanye, penggunaan dana, dan informasi tambahan..."
                  className="form-textarea"
                  rows={5}
                  maxLength={1000}
                />
                <span className="form-hint">{form.description.length}/1000 karakter</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Tag size={13} /> Kategori *
                </label>
                <div className="category-grid">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`cat-option ${form.category === cat ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, category: cat }))}
                    >
                      <span>{CATEGORY_EMOJIS[cat]}</span>
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Alamat Penerima Dana *</label>
                <input
                  name="beneficiary"
                  type="text"
                  value={form.beneficiary}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="form-input"
                  required
                />
                <span className="form-hint">Alamat dompet (wallet address) pihak yang akan menerima dana saat dicairkan.</span>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Gambar Utama (Opsional)</label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    name="imageUrl"
                    type="text"
                    value={form.imageUrl}
                    onChange={handleChange}
                    placeholder="Masukkan URL gambar..."
                    className="form-input"
                    style={{ flex: 1 }}
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <button
                      type="button"
                      onClick={handleCancelUpload}
                      className="quick-amount"
                      style={{ margin: 0, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      <X size={14} /> Batal
                    </button>
                  ) : (
                    <label className="quick-amount" style={{ margin: 0, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <Upload size={14} />
                      Upload File
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp, image/gif"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                <span className="form-hint">Masukkan URL gambar yang valid atau unggah file langsung dari perangkat Anda (Maks 2MB).</span>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">
                <Target size={16} /> Target & Durasi
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <Target size={13} /> Target Donasi (USDC) *
                  </label>
                  <div className="amount-input-wrapper">
                    <input
                      name="targetAmount"
                      type="number"
                      step="any"
                      min="0.01"
                      value={form.targetAmount}
                      onChange={handleChange}
                      placeholder="1000"
                      className="form-input"
                      required
                    />
                    <span className="amount-suffix">USDC</span>
                  </div>
                  {/* Quick targets */}
                  <div className="quick-amounts" style={{ marginTop: 8 }}>
                    {['500', '1000', '2000', '5000'].map(q => (
                      <button
                        key={q}
                        type="button"
                        className="quick-amount"
                        onClick={() => setForm(prev => ({ ...prev, targetAmount: q }))}
                      >
                        {q} USDC
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={13} /> Durasi (Hari) *
                  </label>
                  <input
                    name="durationDays"
                    type="number"
                    min="1"
                    max="365"
                    value={form.durationDays}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                  <div className="quick-amounts" style={{ marginTop: 8 }}>
                    {[7, 14, 30, 60].map(d => (
                      <button
                        key={d}
                        type="button"
                        className="quick-amount"
                        onClick={() => setForm(prev => ({ ...prev, durationDays: String(d) }))}
                      >
                        {d} hari
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Blockchain notice */}
            <div className="create-blockchain-notice">
              <Zap size={16} className="notice-icon" />
              <div>
                <p className="notice-title">Akan Dicatat di Blockchain</p>
                <p className="notice-desc">
                  Kampanye ini akan dieksekusi melalui smart contract dan tercatat permanen di Ethereum.
                  Pastikan semua informasi sudah benar sebelum submit.
                </p>
              </div>
            </div>

            <button type="submit" className="create-submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18 }} />
                  Memproses di Blockchain...
                </>
              ) : (
                <>
                  Buat Kampanye
                </>
              )}
            </button>
          </form>

          {/* Preview */}
          <div className="create-preview">
            <h3 className="preview-title">Preview Kampanye</h3>
            <div className="preview-card glass-card">
              <div
                className="preview-thumb"
                style={form.imageUrl ? { backgroundImage: `url(${form.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!form.imageUrl && <span className="preview-emoji">{preview.emoji}</span>}
              </div>
              <div className="preview-content">
                <span className="preview-category">{form.category}</span>
                <h4 className="preview-campaign-title">
                  {form.title || 'Judul Kampanye Anda'}
                </h4>
                <p className="preview-campaign-desc">
                  {form.description || 'Deskripsi kampanye akan muncul di sini...'}
                </p>
                <div className="progress-bar" style={{ margin: '12px 0' }}>
                  <div className="progress-fill" style={{ width: '0%' }} />
                </div>
                <div className="preview-stats">
                  <div>
                    <p className="preview-stat-val">{form.targetAmount || '0'} USDC</p>
                    <p className="preview-stat-lbl">Target</p>
                  </div>
                  <div>
                    <p className="preview-stat-val">{form.durationDays} Hari</p>
                    <p className="preview-stat-lbl">Durasi</p>
                  </div>
                  <div>
                    <p className="preview-stat-val">{preview.deadline}</p>
                    <p className="preview-stat-lbl">Deadline</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
