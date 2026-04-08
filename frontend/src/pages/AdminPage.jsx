import { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Shield, AlertCircle, ChevronDown, X, ExternalLink, XCircle, BadgeCheck, RefreshCw, Database, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../api';
import './AdminPage.css';

export default function AdminPage() {
  const { contract, account, isConnected, isContractOwner, isOwnerLoaded } = useWeb3();
  const [targetAddress, setTargetAddress] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);

  // Whitelist state
  const [whitelistedUsers, setWhitelistedUsers] = useState([]);
  const [loadingWhitelist, setLoadingWhitelist] = useState(false);

  const loadWhitelistedUsers = async () => {
    if (!contract) return;
    setLoadingWhitelist(true);
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.success && payload.data) {
          const users = payload.data;
          const checks = users.map(async (u) => {
            try {
              if (!/^0x[a-fA-F0-9]{40}$/.test(u.wallet)) return null;
              const isWl = await contract.verifiedCreators(u.wallet);
              return isWl ? { ...u, isWhitelisted: true } : null;
            } catch (e) { return null; }
          });
          const results = await Promise.all(checks);
          const whitelisted = results.filter(r => r !== null);
          setWhitelistedUsers(whitelisted);
        }
      }
    } catch (error) {
      console.error("Gagal mendapatkan daftar whitelist", error);
    } finally {
      setLoadingWhitelist(false);
    }
  };

  useEffect(() => {
    if (contract && isContractOwner) {
      loadWhitelistedUsers();
    }
  }, [contract, isContractOwner]);

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
        <div className="container" style={{ textAlign: 'center', marginTop: 60 }}>
          <Shield size={48} style={{ color: 'var(--primary-400)', opacity: 0.5, marginBottom: 20 }} />
          <h2>Hubungkan Wallet</h2>
          <p>Harap hubungkan wallet Anda untuk mengakses halaman admin.</p>
        </div>
      </div>
    );
  }

  // Tampilkan loading spinner saat sedang mengecek apakah wallet adalah owner
  if (!isOwnerLoaded) {
    return (
      <div className="admin-page">
        <div className="container" style={{ textAlign: 'center', marginTop: 60 }}>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 20px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Memverifikasi akses administrator...</p>
        </div>
      </div>
    );
  }

  // Jika Connected tetapi BUKAN owner
  if (!isContractOwner) {
    return (
      <div className="admin-page">
        <div className="container" style={{ textAlign: 'center', marginTop: 60 }}>
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
      toast.custom((t) => (
        <div style={{
          opacity: t.visible ? 1 : 0, transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: t.visible ? 'scale(1)' : 'scale(0.95)',
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 20px 40px -10px rgba(245, 158, 11, 0.15)', minWidth: '300px', pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <AlertCircle size={22} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Validasi Gagal</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#f59e0b', marginTop: '2px' }}>Input tidak sesuai</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #f59e0b', textAlign: 'center' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>Format alamat harus Ethereum yang valid (0x...).</span>
          </div>
        </div>
      ), { duration: 4000 });
      return;
    }

    setLoading(true);
    let toastId;

    try {
      const statusBool = isVerified === 'true' || isVerified === true;

      if (contract.verifiedCreators) {
        const currentStatus = await contract.verifiedCreators(targetAddress);
        if (currentStatus === statusBool) {
          toast.custom((t) => (
            <div style={{
              opacity: t.visible ? 1 : 0, transition: 'transform 0.3s ease, opacity 0.3s ease',
              transform: t.visible ? 'scale(1)' : 'scale(0.95)',
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px',
              boxShadow: '0 20px 40px -10px rgba(245, 158, 11, 0.15)', minWidth: '300px', pointerEvents: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                  <AlertCircle size={22} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Aksi Tidak Diperlukan</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#f59e0b', marginTop: '2px' }}>Status sudah diberikan</p>
                </div>
                <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ), { duration: 4000 });
          setLoading(false);
          return;
        }
      }

      toastId = toast.loading('Memproses verifikasi di Blockchain...');
      const tx = await contract.verifyCreator(targetAddress, statusBool);

      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });
      await tx.wait();

      toast.success('Status otoritas berhasil diperbarui!', { id: toastId });
      setTargetAddress('');
      loadWhitelistedUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || 'Gagal melakukan verifikasi', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    const toastId = toast.loading('Sinkronisasi database dengan blockchain...');

    try {
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;

      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress, rpcUrl })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

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
              <Database size={22} style={{ color: '#34d399' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Sinkronisasi Selesai!</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {data.message || 'Database berhasil diselaraskan dengan blockchain.'}
              </p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          {data.stats && data.stats.syncedToBlock && (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#cbd5e1' }}>📦 Kampanye Baru</span>
                <strong style={{ color: '#10b981' }}>{data.stats.campaigns}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#cbd5e1' }}>💰 Donasi Baru</span>
                <strong style={{ color: '#10b981' }}>{data.stats.donations}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#cbd5e1' }}>🏦 Pencairan Baru</span>
                <strong style={{ color: '#10b981' }}>{data.stats.withdrawals}</strong>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                Sampai Blok: <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>#{data.stats.syncedToBlock}</span>
              </div>
            </div>
          )}
        </div>
      ), { id: toastId, duration: 8000 });
    } catch (err) {
      console.error(err);
      toast.error('Gagal melakukan sinkronisasi: ' + err.message, { id: toastId });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Alamat disalin!', {
      icon: '📋',
      style: {
        background: 'rgba(15, 23, 42, 0.9)',
        color: '#fff',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px'
      }
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-main-container container">

        <div className="admin-hero">
          <h1 className="admin-title">Panel <span className="gradient-text">Otoritas</span></h1>
          <p className="admin-desc">Pusat kendali operasional dan sinkronisasi transparansi platform ChainDonate.</p>
        </div>

        {/* TWO-COLUMN DASHBOARD LAYOUT */}
        <div className="admin-two-column-layout">

          {/* LEFT COLUMN: ACTIONS & SYNC */}
          <div className="admin-left-col">
            {/* AUTHORITY CONTROL */}
            <div className="admin-pane primary-pane glass-card">
              <div className="pane-header">
                <h3 className="pane-title">Manajemen Otoritas</h3>
                <p className="pane-desc">Kelola izin pembuatan kampanye di blockchain.</p>
              </div>

              <form onSubmit={handleVerify} className="admin-compact-form">
                <div className="form-group">
                  <label className="form-label">Wallet Address</label>
                  <input
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="0x..."
                    className="form-input monospace"
                    required
                  />
                </div>

                <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                  <label className="form-label">Tindakan Otoritas</label>
                  <div
                    className={`custom-dropdown-trigger form-input ${isDropdownOpen ? 'active' : ''}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isVerified ? (
                        <><BadgeCheck size={16} color="var(--success-400)" /> <span>Whitelist (Izinkan)</span></>
                      ) : (
                        <><XCircle size={16} color="var(--danger-400)" /> <span>Revoke (Cabut)</span></>
                      )}
                    </div>
                    <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }} />
                  </div>

                  {isDropdownOpen && (
                    <div className="custom-dropdown-menu">
                      <div className={`custom-dropdown-item ${isVerified === true ? 'selected' : ''}`} onClick={() => { setIsVerified(true); setIsDropdownOpen(false); }}>
                        <BadgeCheck size={14} /> Whitelist (Izinkan)
                      </div>
                      <div className={`custom-dropdown-item ${isVerified === false ? 'selected' : ''}`} onClick={() => { setIsVerified(false); setIsDropdownOpen(false); }}>
                        <XCircle size={14} /> Revoke (Cabut)
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className="admin-action-btn" disabled={loading}>
                  {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Shield size={16} />}
                  <span>Konfirmasi Otoritas</span>
                </button>
              </form>
            </div>

            {/* SYSTEM SYNC (Now on Left) */}
            <div className="admin-pane side-pane glass-card">
              <div className="pane-header">
                <h3 className="pane-title">Status Data</h3>
                <p className="pane-desc">Audit & Sinkronisasi.</p>
              </div>

              <div className="sync-status-box">
                <div className="sync-detail">
                  <span>Backend: <strong>Operational</strong></span>
                </div>
                <p className="sync-memo">Gunakan sinkronisasi jika data blockchain tidak sesuai dengan antarmuka.</p>
              </div>

              <button onClick={handleSync} className="sync-btn" disabled={syncLoading}>
                {syncLoading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Database size={16} />}
                <span>Synchronize</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: WHITELIST LIST ONLY */}
          <div className="admin-right-col">
            <div className="admin-pane whitelist-pane glass-card">

              {/* Panel Header */}
              <div className="whitelist-pane-header">
                <div className="whitelist-pane-title-row">
                  <h3 className="whitelist-pane-title">
                    Daftar Akun Whitelist
                  </h3>
                  <button
                    type="button"
                    onClick={loadWhitelistedUsers}
                    className={`whitelist-refresh-btn${loadingWhitelist ? ' loading' : ''}`}
                    disabled={loadingWhitelist}
                  >
                    <RefreshCw size={13} className={loadingWhitelist ? 'spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
                <p className="whitelist-pane-desc">Otoritas yang terdaftar di blockchain.</p>
              </div>

              {/* Panel Body */}
              <div className="whitelist-pane-body">
                {loadingWhitelist ? (
                  <div className="whitelist-state-empty">
                    <div className="spinner whitelist-spinner" />
                    <p>Memuat data...</p>
                  </div>
                ) : whitelistedUsers.length === 0 ? (
                  <div className="whitelist-state-empty">
                    <div className="whitelist-empty-icon"><BadgeCheck size={28} /></div>
                    <p>Belum ada akun terdaftar.</p>
                  </div>
                ) : (
                  <div className="whitelist-list custom-scrollbar">
                    {whitelistedUsers.map((u, i) => (
                      <div key={u.wallet} className="wl-card">
                        <div className="wl-card-index">{i + 1}</div>
                        <div className="wl-card-info">
                          <div className="wl-card-name-row">
                            <div className="wl-card-name">{u.name}</div>
                            <BadgeCheck size={14} className="verified-badge-inline" />
                          </div>
                          <div
                            className="wl-card-wallet monospace"
                            onClick={() => handleCopy(u.wallet)}
                            title="Salin alamat"
                          >
                            <span>{u.wallet.substring(0, 21)}...{u.wallet.substring(34)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
