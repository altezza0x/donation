import { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Shield, AlertCircle, Wallet, ChevronDown, X, ExternalLink, XCircle, BadgeCheck, Coins, RefreshCw, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE } from '../api';
import './AdminPage.css';

export default function AdminPage() {
  const { contract, usdcContract, account, isConnected, isContractOwner, isOwnerLoaded } = useWeb3();
  const [targetAddress, setTargetAddress] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Mint USDC state
  const [mintAddress, setMintAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [mintLoading, setMintLoading] = useState(false);

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);

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

  // Tampilkan loading spinner saat sedang mengecek apakah wallet adalah owner
  if (!isOwnerLoaded) {
    return (
      <div className="admin-page">
        <div className="container" style={{ textAlign: 'center', marginTop: 100 }}>
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
      
      // Check current blockchain state before proceeding
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
                  <p style={{ margin: 0, fontSize: '13px', color: '#f59e0b', marginTop: '2px' }}>Status sudah sama</p>
                </div>
                <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #f59e0b', textAlign: 'center' }}>
                <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>
                  Wallet ini sudah berstatus <b>{statusBool ? 'Whitelist' : 'Revoke'}</b>.
                </span>
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
              <Shield size={22} style={{ color: '#34d399' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Verifikasi Sukses</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>Status kreator diperbarui</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <strong style={{ color: '#10b981', fontSize: '13px' }}>{statusBool ? 'Whitelist Ditambahkan' : 'Whitelist Dicabut'}</strong>
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
            Lacak di Blockchain <ExternalLink size={14} />
          </a>
        </div>
      ), { id: toastId, duration: 8000 });
      setTargetAddress('');
    } catch (err) {
      console.error(err);
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
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Verifikasi Gagal</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171', marginTop: '2px' }}>Reverted by blockchain</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #ef4444' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>{err.reason || 'Gagal melakukan verifikasi'}</span>
          </div>
        </div>
      ), { id: toastId, duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async (e) => {
    e.preventDefault();
    if (!usdcContract) return;

    if (!mintAddress || !/^0x[a-fA-F0-9]{40}$/.test(mintAddress)) {
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
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Format Salah</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#f59e0b', marginTop: '2px' }}>Alamat wallet tidak valid</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      ), { duration: 4000 });
      return;
    }

    const parsedAmount = parseFloat(mintAmount);
    if (!mintAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Masukkan jumlah USDC yang valid');
      return;
    }

    setMintLoading(true);
    const toastId = toast.loading('Mint USDC ke blockchain...');

    try {
      // Konversi ke 6 desimal
      const amountRaw = BigInt(Math.round(parsedAmount * 1_000_000));
      const tx = await usdcContract.mint(mintAddress, amountRaw);
      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });
      await tx.wait();

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
              <Coins size={22} style={{ color: '#34d399' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Mint Berhasil!</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>{parsedAmount.toLocaleString()} USDC dikirim</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Penerima</span>
            <span style={{ color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace' }}>{mintAddress}</span>
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', textDecoration: 'none',
              padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 500
            }}
          >
            Lihat di Etherscan <ExternalLink size={14} />
          </a>
        </div>
      ), { id: toastId, duration: 8000 });

      setMintAddress('');
      setMintAmount('');
    } catch (err) {
      console.error(err);
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
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>Mint Gagal</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171', marginTop: '2px' }}>Transaksi ditolak blockchain</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #ef4444' }}>
            <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{err.reason || err.message || 'Gagal mint USDC'}</span>
          </div>
        </div>
      ), { id: toastId, duration: 8000 });
    } finally {
      setMintLoading(false);
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
      ), { id: toastId, duration: 10000 });

    } catch (err) {
      console.error(err);
      toast.error('Gagal melakukan sinkronisasi: ' + err.message, { id: toastId, duration: 6000 });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-bg" />
        <div className="container">
          <span className="section-tag">Administrator</span>
          <h1 className="admin-title">
            Panel <span className="gradient-text">Admin</span>
          </h1>
          <p className="admin-desc">
            Kelola whitelist kreator kampanye dan distribusi Mock USDC untuk keperluan testing donasi di Sepolia Testnet.
          </p>
        </div>
      </div>

      <div className="admin-cards-grid container">

        {/* ── Card 1: Whitelist Kreator ── */}
        <div className="admin-card glass-card">
          <div className="admin-card-header">
            <div className="admin-card-icon" style={{ background: 'rgba(99, 102, 241, 0.12)' }}>
              <Shield size={22} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div>
              <h3 className="admin-card-title">Whitelist Kreator</h3>
              <p className="admin-card-desc">Kelola hak akses pembuatan kampanye donasi.</p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="admin-form">
            <div className="form-group">
              <label className="form-label">Alamat Wallet</label>
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
              <label className="form-label">Status Otorisasi</label>
              <div
                className={`custom-dropdown-trigger form-input ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isVerified ? (
                    <><BadgeCheck size={18} color="var(--success-400)" /> <span>Berikan Izin (Whitelist)</span></>
                  ) : (
                    <><XCircle size={18} color="var(--danger-400)" /> <span>Cabut Izin (Revoke)</span></>
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
                    <BadgeCheck size={16} /> Berikan Izin (Whitelist)
                  </div>
                  <div
                    className={`custom-dropdown-item ${isVerified === false ? 'selected' : ''}`}
                    onClick={() => { setIsVerified(false); setIsDropdownOpen(false); }}
                  >
                    <XCircle size={16} /> Cabut Izin (Revoke)
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="admin-submit-btn" disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Memproses...</>
              ) : (
                <><Shield size={16} /> Konfirmasi ke Blockchain</>
              )}
            </button>
          </form>
        </div>

        {/* ── Card 2: Mint Mock USDC ── */}
        <div className="admin-card glass-card">
          <div className="admin-card-header">
            <div className="admin-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
              <Coins size={22} style={{ color: 'var(--success-400)' }} />
            </div>
            <div>
              <h3 className="admin-card-title">Distribusi Mock USDC</h3>
              <p className="admin-card-desc">Mint token USDC ke alamat wallet manapun untuk testing donasi.</p>
            </div>
          </div>

          <form onSubmit={handleMint} className="admin-form">
            <div className="form-group">
              <label className="form-label">Alamat Penerima</label>
              <input
                type="text"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                placeholder="0x..."
                className="form-input monospace"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Jumlah USDC</label>
              <div className="mint-amount-wrapper">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="1000"
                  className="form-input"
                  required
                />
                <span className="mint-amount-suffix">USDC</span>
              </div>
              {/* Quick amounts */}
              <div className="mint-quick-amounts">
                {['100', '500', '1000', '5000'].map(q => (
                  <button key={q} type="button" className="mint-quick-btn" onClick={() => setMintAmount(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="mint-info-box">
              <Wallet size={13} />
              <span>Token ini adalah <strong>Mock USDC</strong> untuk Sepolia Testnet — tidak memiliki nilai nyata.</span>
            </div>

            <button type="submit" className="admin-submit-btn mint-btn" disabled={mintLoading}>
              {mintLoading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Minting...</>
              ) : (
                <><Coins size={16} /> Mint USDC Sekarang</>
              )}
            </button>
          </form>
        </div>

        {/* ── Card 3: Sinkronisasi Blockchain ── */}
        <div className="admin-card glass-card">
          <div className="admin-card-header">
            <div className="admin-card-icon" style={{ background: 'rgba(56, 189, 248, 0.12)' }}>
              <RefreshCw size={22} style={{ color: 'var(--accent-400)' }} className={syncLoading ? 'spin-animation' : ''} />
            </div>
            <div>
              <h3 className="admin-card-title">Sinkronisasi Database</h3>
              <p className="admin-card-desc">Scan permanen riwayat Blockchain Sepolia dan rekam semua Hash Transaksi baru ke Database MongoDB.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            <div className="mint-info-box" style={{ background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.1)' }}>
              <Database size={13} style={{ color: 'var(--accent-400)' }} />
              <span>Gunakan fitur ini jika ada transaksi di blockchain yang gagal tersimpan ke database karena masalah koneksi/server. Fitur ini aman (read-only) & gratis.</span>
            </div>

            <button 
              onClick={handleSync} 
              className="admin-submit-btn" 
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(56, 189, 248, 0.2)', width: '100%', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', cursor: 'pointer', transition: '0.2s', opacity: syncLoading ? 0.7 : 1 }}
              onMouseOver={(e) => {if(!syncLoading) e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';}}
              onMouseOut={(e) => {if(!syncLoading) e.currentTarget.style.background = 'var(--bg-card)';}}
              disabled={syncLoading}
            >
              {syncLoading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'var(--accent-400)' }} /> Mengekstrak data blockchain...</>
              ) : (
                <><RefreshCw size={16} style={{ color: 'var(--accent-400)' }} /> Jalankan Sinkronisasi Penuh</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
