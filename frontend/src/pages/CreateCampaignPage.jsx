import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { parseEther } from 'viem';
import toast from 'react-hot-toast';
import { PlusCircle, Wallet, Info, Calendar, Target, Tag, FileText, Zap, Upload } from 'lucide-react';
import './CreateCampaignPage.css';

const CATEGORIES = ['Pendidikan', 'Kesehatan', 'Bencana Alam', 'Keagamaan', 'Sosial', 'Lainnya'];
const CATEGORY_EMOJIS = {
  Pendidikan: '🎓', Kesehatan: '🏥', 'Bencana Alam': '🆘',
  Keagamaan: '🕌', Sosial: '🤝', Lainnya: '💡',
};

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const { contract, isConnected, user } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Pendidikan',
    targetAmount: '',
    durationDays: '30',
    imageUrl: '',
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

    setUploadingImage(true);
    const toastId = toast.loading('Mengunggah gambar...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result;
        const ext = '.' + file.name.split('.').pop();
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, ext })
        });
        const data = await res.json();
        
        if (res.ok) {
          setForm(prev => ({ ...prev, imageUrl: data.url }));
          toast.success('Gambar berhasil diunggah!', { id: toastId });
        } else {
          throw new Error(data.error || 'Server error');
        }
        setUploadingImage(false);
      };
      reader.onerror = () => {
        throw new Error('Gagal membaca file');
      };
    } catch (error) {
      toast.error(error.message || 'Gagal mengunggah gambar', { id: toastId });
      console.error(error);
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected) { toast.error('Hubungkan wallet MetaMask!'); return; }
    if (!user?.isRegistered) { toast.error('Daftar akun terlebih dahulu!'); return; }
    if (!form.title.trim()) { toast.error('Judul tidak boleh kosong'); return; }
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) { toast.error('Target donasi harus > 0'); return; }
    if (!form.durationDays || parseInt(form.durationDays) < 1) { toast.error('Durasi minimal 1 hari'); return; }

    setLoading(true);
    const toastId = toast.loading('Membuat kampanye di blockchain...');

    try {
      const targetWei = parseEther(form.targetAmount.toString());
      const duration = parseInt(form.durationDays);

      const tx = await contract.createCampaign(
        form.title,
        form.description,
        form.category,
        form.imageUrl,
        targetWei,
        duration
      );

      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });
      const receipt = await tx.wait();

      toast.success('✅ Kampanye berhasil dibuat!', { id: toastId, duration: 5000 });
      navigate('/campaigns');
    } catch (err) {
      const msg = err.reason || err.message || 'Gagal membuat kampanye';
      toast.error(msg.slice(0, 100), { id: toastId });
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
                  />
                  <label className="quick-amount" style={{ margin: 0, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: uploadingImage ? 0.5 : 1 }}>
                    <Upload size={14} />
                    {uploadingImage ? 'Mengunggah...' : 'Upload File'}
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp, image/gif" 
                      onChange={handleImageUpload} 
                      style={{ display: 'none' }}
                      disabled={uploadingImage}
                    />
                  </label>
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
                    <Target size={13} /> Target Donasi (ETH) *
                  </label>
                  <div className="amount-input-wrapper">
                    <input
                      name="targetAmount"
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={form.targetAmount}
                      onChange={handleChange}
                      placeholder="1.0"
                      className="form-input"
                      required
                    />
                    <span className="amount-suffix">ETH</span>
                  </div>
                  {/* Quick targets */}
                  <div className="quick-amounts" style={{ marginTop: 8 }}>
                    {['0.5', '1', '2', '5'].map(q => (
                      <button
                        key={q}
                        type="button"
                        className="quick-amount"
                        onClick={() => setForm(prev => ({ ...prev, targetAmount: q }))}
                      >
                        {q} ETH
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
                  <PlusCircle size={18} />
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
                    <p className="preview-stat-val">{form.targetAmount || '0'} ETH</p>
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
