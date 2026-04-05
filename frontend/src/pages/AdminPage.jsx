import { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Shield, PlusCircle, AlertCircle, CheckCircle, Wallet, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminPage.css';

export default function AdminPage() {
  const { contract, account, isConnected, isContractOwner } = useWeb3();
  const [targetAddress, setTargetAddress] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="admin-page">
        <div className="container" style={{ textAlign: 'center', marginTop: 100 }}>
          <Shield size={48} style={{ color: 'var(--primary-400)', opacity: 0.5, marginBottom: 20 }} />
          <h2>Hubungkan Wallet</h2>
          <p>Harap hubungkan MetaMask Anda untuk mengakses Halaman Admin.</p>
        </div>
      </div>
    );
  }

  // Jika Connected tetapi BUKAN owner
  if (!isContractOwner) {
    return (
      <div className="admin-page">
        <div className="container" style={{ textAlign: 'center', marginTop: 100 }}>
          <AlertCircle size={48} style={{ color: 'var(--danger-400)', opacity: 0.8, marginBottom: 20 }} />
          <h2>Akses Ditolak</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Halaman ini hanya dapat diakses oleh Administrator (Pemilik Smart Contract).<br />
            Dompet Anda saat ini: <br />
            <span className="monospace" style={{ padding: 4, background: 'var(--bg-glass)', borderRadius: 4 }}>{account}</span>
          </p>
        </div>
      </div>
    );
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!contract) return;

    // Validasi basic eth address
    if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      toast.error('Format alamat Ethereum tidak valid!');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Memproses verifikasi di Blockchain...');

    try {
      const statusBool = isVerified === 'true' || isVerified === true;
      const tx = await contract.verifyCreator(targetAddress, statusBool);

      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });
      await tx.wait();

      toast.success(`✅ Alamat berhasi di-${statusBool ? 'whitelist' : 'hapus dari whitelist'}!`, { id: toastId });
      setTargetAddress('');
    } catch (err) {
      console.error(err);
      toast.error(err.reason || 'Gagal melakukan verifikasi', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-bg" />
        <div className="container">
          <span className="section-tag">Administrator</span>
          <h1 className="admin-title">
            Pengelolaan <span className="gradient-text">Whitelist Kampanye</span>
          </h1>
          <p className="admin-desc">
            Manajemen verifikasi address (Verified Creators). Hanya pembuat kampanye yang masuk daftar whitelist yang dapat membuat kampanye donasi baru.
          </p>
        </div>
      </div>

      <div className="container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '80px' }}>
        <div className="admin-card glass-card" style={{ padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '480px' }}>
          <h3 className="admin-card-title" style={{ fontSize: '1.4rem', justifyContent: 'center', marginBottom: '16px' }}>
            <Shield size={24} style={{ color: 'var(--primary-400)' }} />
            Verifikasi Kreator
          </h3>
          <p className="admin-card-desc" style={{ textAlign: 'center', marginBottom: '32px' }}>
            Masukkan address wallet untuk mengelola hak akses pembuatan kampanye donasi.
          </p>

          <form onSubmit={handleVerify} className="admin-form">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Alamat Wallet</label>
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="0x..."
                className="form-input monospace"
                style={{ padding: '14px 16px', fontSize: '0.95rem' }}
                required
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
              <label className="form-label" style={{ fontWeight: 600 }}>Status Otorisasi</label>
              
              <div 
                className={`custom-dropdown-trigger form-input ${isDropdownOpen ? 'active' : ''}`}
                style={{ padding: '14px 16px', fontSize: '0.95rem' }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isVerified ? (
                    <><CheckCircle size={18} color="var(--success-400)" /> <span>Berikan Izin (Whitelist)</span></>
                  ) : (
                    <><AlertCircle size={18} color="var(--danger-400)" /> <span>Cabut Izin (Revoke)</span></>
                  )}
                </div>
                <ChevronDown size={18} style={{ color: 'var(--text-muted)', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
              </div>

              {isDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div 
                    className={`custom-dropdown-item ${isVerified === true ? 'selected' : ''}`}
                    onClick={() => { setIsVerified(true); setIsDropdownOpen(false); }}
                  >
                    <CheckCircle size={16} /> Berikan Izin (Whitelist)
                  </div>
                  <div 
                    className={`custom-dropdown-item ${isVerified === false ? 'selected' : ''}`}
                    onClick={() => { setIsVerified(false); setIsDropdownOpen(false); }}
                  >
                    <AlertCircle size={16} /> Cabut Izin (Revoke)
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="admin-submit-btn" disabled={loading} style={{ marginTop: '24px', padding: '16px', borderRadius: '12px' }}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Memproses...
                </>
              ) : (
                'Konfirmasi ke Blockchain'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
