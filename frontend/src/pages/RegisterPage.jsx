import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import toast from 'react-hot-toast';
import {
  UserPlus, Wallet, Heart, Building2, CheckCircle, Shield,
  Zap, ArrowRight, ArrowLeft, Sparkles, Globe, Lock, User, Mail
} from 'lucide-react';
import './RegisterPage.css';

const ROLES = [
  {
    id: 'donor',
    label: 'Donatur',
    icon: Heart,
    emoji: '💖',
    desc: 'Berdonasi untuk mendukung kampanye kemanusiaan.',
    features: ['Berdonasi ke kampanye', 'Lacak riwayat donasi', 'Pantau penggunaan dana'],
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.25)',
  },
  {
    id: 'recipient',
    label: 'Penggalang Dana',
    icon: Building2,
    emoji: '🏛️',
    desc: 'Buat kampanye penggalangan dana untuk kegiatan sosial.',
    features: ['Buat kampanye donasi', 'Kelola dana terkumpul', 'Tarik dana ke wallet'],
    gradient: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.25)',
  },
];

const STEPS = [
  { label: 'Pilih Peran', icon: Sparkles },
  { label: 'Isi Data', icon: User },
  { label: 'Konfirmasi', icon: CheckCircle },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { contract, isConnected, account, user, refreshUser, signer } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', role: 'donor' });

  const selectedRole = ROLES.find(r => r.id === form.role);

  const canNext = () => {
    if (step === 0) return !!form.role;
    if (step === 1) return form.name.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!isConnected) { toast.error('Hubungkan wallet terlebih dahulu!'); return; }
    if (!form.name.trim()) { toast.error('Nama tidak boleh kosong!'); return; }
    if (!signer) { toast.error('Wallet signer tidak tersedia!'); return; }

    setLoading(true);
    const toastId = toast.loading('Meminta tanda tangan...');

    try {
      const message = `Halo ${form.name.trim()}!\n\nSilakan tanda tangani pesan ini untuk memverifikasi kepemilikan dompet Anda dan menyelesaikan registrasi di platform Donasi secara Gratis (Bebas Gas Fee).\n\nAlamat: ${account}\nPeran: ${form.role}`;
      const signature = await signer.signMessage({ account, message });

      const userData = {
        wallet: account,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        isRegistered: true,
        registeredAt: Date.now(),
        signature: signature
      };
      
      localStorage.setItem(`donationUser_${account}`, JSON.stringify(userData));

      await refreshUser();
      toast.success('✅ Registrasi berhasil!', { id: toastId, duration: 5000 });
      navigate(form.role === 'recipient' ? '/create' : '/campaigns');
    } catch (err) {
      const msg = err.reason || err.message || 'Gagal mendaftar';
      toast.error(msg.slice(0, 100), { id: toastId });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Wallet not connected ---------- */
  if (!isConnected) {
    return (
      <div className="register-page">
        <div className="register-center-wrap">
          <div className="register-gate-card">
            <div className="gate-glow" />
            <div className="gate-icon-wrap">
              <Wallet size={32} />
            </div>
            <h2>Hubungkan Wallet</h2>
            <p>Hubungkan MetaMask Anda untuk memulai pendaftaran. Identitas Anda akan terikat pada wallet Ethereum.</p>
            <div className="gate-features">
              <div className="gate-feature"><Shield size={16} /> <span>Terdesentralisasi & Aman</span></div>
              <div className="gate-feature"><Globe size={16} /> <span>Transparan di Blockchain</span></div>
              <div className="gate-feature"><Lock size={16} /> <span>Tidak Dapat Dimanipulasi</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Already registered ---------- */
  if (user?.isRegistered) {
    return (
      <div className="register-page">
        <div className="register-center-wrap">
          <div className="register-success-card">
            <div className="success-glow" />
            <div className="success-anim">
              <div className="success-circle">
                <CheckCircle size={36} />
              </div>
              <div className="success-rings" />
            </div>
            <h2>Anda Sudah Terdaftar! 🎉</h2>
            <p>Akun Anda telah terverifikasi melalui signature lokal tanpa biaya gas.</p>
            <div className="success-detail-card">
              <div className="success-row">
                <span className="success-lbl">Nama</span>
                <span className="success-val">{user.name}</span>
              </div>
              <div className="success-divider" />
              <div className="success-row">
                <span className="success-lbl">Peran</span>
                <span className={`success-role-badge ${user.role}`}>
                  {user.role === 'donor' ? '❤️ Donatur' : '🏛️ Penggalang'}
                </span>
              </div>
              <div className="success-divider" />
              <div className="success-row">
                <span className="success-lbl">Wallet</span>
                <span className="success-addr">{account?.slice(0, 10)}...{account?.slice(-6)}</span>
              </div>
            </div>
            <button onClick={() => navigate('/campaigns')} className="success-go-btn">
              <span>Mulai Jelajahi</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Registration wizard ---------- */
  return (
    <div className="register-page">
      {/* Background decorations */}
      <div className="reg-bg-orb reg-bg-orb-1" />
      <div className="reg-bg-orb reg-bg-orb-2" />
      <div className="reg-bg-grid" />

      <div className="register-center-wrap">
        {/* Header */}
        <div className="register-hero">
          <span className="reg-chip">
            <Sparkles size={14} />
            Registrasi Signature (Bebas Biaya)
          </span>
          <h1>
            Bergabung & Mulai <span className="gradient-text">Berdonasi</span>
          </h1>
          <p className="reg-hero-sub">
            Verifikasi dompet Anda secara gratis melalui signature kriptografi. Tidak ada gas fee yang dikenakan.
          </p>
        </div>

        {/* Stepper */}
        <div className="reg-stepper">
          {STEPS.map((s, i) => (
            <div key={i} className={`reg-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="reg-step-dot">
                {i < step ? <CheckCircle size={16} /> : <s.icon size={16} />}
              </div>
              <span className="reg-step-label">{s.label}</span>
              {i < STEPS.length - 1 && <div className={`reg-step-line ${i < step ? 'filled' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="register-main-card">
          {/* Wallet status bar */}
          <div className="reg-wallet-bar">
            <div className="reg-wallet-pulse" />
            <div className="reg-wallet-info">
              <span className="reg-wallet-label">Wallet Terhubung</span>
              <span className="reg-wallet-addr">{account?.slice(0, 8)}...{account?.slice(-6)}</span>
            </div>
            <div className="reg-wallet-status">Terhubung</div>
          </div>

          {/* Step 0: Role selection */}
          {step === 0 && (
            <div className="reg-step-content animate-step">
              <div className="step-header">
                <h3>Pilih Peran Anda</h3>
                <p>Tentukan bagaimana Anda ingin berkontribusi di platform</p>
              </div>
              <div className="reg-role-grid">
                {ROLES.map(({ id, label, icon: Icon, emoji, desc, features, gradient, bg, border }) => (
                  <div
                    key={id}
                    className={`reg-role-card ${form.role === id ? 'selected' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, role: id }))}
                    style={{
                      '--role-gradient': gradient,
                      '--role-bg': bg,
                      '--role-border': border,
                    }}
                  >
                    <div className="reg-role-check">
                      {form.role === id && <CheckCircle size={20} />}
                    </div>
                    <div className="reg-role-icon-box" style={{ background: gradient }}>
                      <Icon size={24} color="white" />
                    </div>
                    <span className="reg-role-emoji">{emoji}</span>
                    <h4>{label}</h4>
                    <p>{desc}</p>
                    <ul className="reg-role-features">
                      {features.map(f => (
                        <li key={f}>
                          <CheckCircle size={12} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Personal info */}
          {step === 1 && (
            <div className="reg-step-content animate-step">
              <div className="step-header">
                <h3>Informasi Anda</h3>
                <p>Lengkapi profil lokal Anda (tidak masuk ke blockchain)</p>
              </div>
              <div className="reg-form-fields">
                <div className="reg-field">
                  <label className="reg-field-label">
                    <User size={14} />
                    <span>Nama Lengkap / Organisasi <em>*</em></span>
                  </label>
                  <div className="reg-input-wrap">
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Contoh: John Doe atau Yayasan ABC"
                      maxLength={100}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="reg-field">
                  <label className="reg-field-label">
                    <Mail size={14} />
                    <span>Email <em className="optional">(opsional)</em></span>
                  </label>
                  <div className="reg-input-wrap">
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@contoh.com"
                    />
                  </div>
                  <span className="reg-field-hint">
                    <Shield size={11} />
                    Email hanya akan disimpan secara lokal, tidak disebarkan ke publik
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Confirmation */}
          {step === 2 && (
            <div className="reg-step-content animate-step">
              <div className="step-header">
                <h3>Konfirmasi Pendaftaran</h3>
                <p>Periksa kembali data Anda sebelum mendaftar</p>
              </div>
              <div className="reg-confirm-card">
                <div className="reg-confirm-role">
                  <div className="reg-confirm-icon" style={{ background: selectedRole?.gradient }}>
                    {selectedRole && <selectedRole.icon size={24} color="white" />}
                  </div>
                  <div>
                    <span className="confirm-small">Mendaftar sebagai</span>
                    <h4>{selectedRole?.label}</h4>
                  </div>
                </div>
                <div className="reg-confirm-divider" />
                <div className="reg-confirm-rows">
                  <div className="reg-confirm-row">
                    <span className="confirm-key"><User size={14} /> Nama</span>
                    <span className="confirm-val">{form.name || '-'}</span>
                  </div>
                  <div className="reg-confirm-row">
                    <span className="confirm-key"><Mail size={14} /> Email</span>
                    <span className="confirm-val">{form.email || '(tidak diisi)'}</span>
                  </div>
                  <div className="reg-confirm-row">
                    <span className="confirm-key"><Wallet size={14} /> Wallet</span>
                    <span className="confirm-val mono">{account?.slice(0, 12)}...{account?.slice(-8)}</span>
                  </div>
                </div>
              </div>
              <div className="reg-confirm-notice">
                <Lock size={14} />
                <span>Registrasi <strong>bebas biaya</strong>. Anda hanya diminta untuk menandatangani pesan (signature) untuk konfirmasi kepemilikan dompet.</span>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="reg-nav-buttons">
            {step > 0 && (
              <button className="reg-nav-back" onClick={() => setStep(s => s - 1)} disabled={loading}>
                <ArrowLeft size={16} />
                Kembali
              </button>
            )}
            <div className="reg-nav-spacer" />
            {step < 2 ? (
              <button
                className="reg-nav-next"
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
              >
                Selanjutnya
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="reg-nav-submit"
                onClick={handleSubmit}
                disabled={loading || !canNext()}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18 }} />
                    Mendaftar...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Daftar Sekarang
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bottom trust badges */}
        <div className="reg-trust-row">
          <div className="reg-trust-item">
            <Shield size={16} />
            <span>Terverifikasi</span>
          </div>
          <div className="reg-trust-item">
            <Lock size={16} />
            <span>Enkripsi End-to-End</span>
          </div>
          <div className="reg-trust-item">
            <Zap size={16} />
            <span>Blockchain Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
