import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { parseUsdc } from '../contracts/MockUSDC';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSafeConnect } from '../hooks/useSafeConnect';
import { Wallet, CheckCircle, X, ExternalLink, AlertCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { requestEthFaucet } from '../api';
import './FaucetPage.css';

export default function FaucetPage() {
  const { account, isConnected, usdcContract, shortAddress, usdcAddress } = useWeb3();
  const { openSafeConnectModal } = useSafeConnect();
  const [loadingUsdc, setLoadingUsdc] = useState(false);
  const [loadingEth, setLoadingEth] = useState(false);
  const [lastUsdcTx, setLastUsdcTx] = useState(null);
  const [lastEthTx, setLastEthTx] = useState(null);

  const handleCopyAddress = (addr) => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    toast.success('Address disalin!', {
      style: {
        borderRadius: '10px',
        background: '#1e293b',
        color: '#fff',
        fontSize: '13px'
      },
    });
  };

  // NOTIFIKASI STANDARD-SMALL (RINGKAS & ELEGAN)
  const showSuccessToast = (title, amount, txHash, colorClass = 'success') => {
    const isEth = colorClass === 'gold';
    const primaryColor = isEth ? '#f59e0b' : '#34d399';
    const bgGlow = isEth ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';

    toast.custom((t) => (
      <div style={{
        opacity: t.visible ? 1 : 0, transition: 'all 0.3s ease',
        transform: t.visible ? 'translateY(0)' : 'translateY(-10px)',
        background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: `0 8px 24px -8px ${bgGlow}`, minWidth: '240px', maxWidth: '320px', pointerEvents: 'auto'
      }}>
        <CheckCircle size={18} style={{ color: primaryColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{amount} Terkirim</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#94a3b8' }}>
            <ExternalLink size={14} />
          </a>
          <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}>
            <X size={16} />
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const showErrorToast = (message) => {
    toast.custom((t) => (
      <div style={{
        opacity: t.visible ? 1 : 0, transition: 'all 0.3s ease',
        transform: t.visible ? 'translateY(0)' : 'translateY(-10px)',
        background: 'rgba(23, 23, 35, 0.98)', border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 8px 20px -10px rgba(239, 68, 68, 0.2)', minWidth: '240px', maxWidth: '320px', pointerEvents: 'auto'
      }}>
        <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '12px', color: '#f8fafc', fontWeight: 500, lineHeight: '1.4', flex: 1 }}>{message}</p>
        <button onClick={() => toast.dismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}>
          <X size={16} />
        </button>
      </div>
    ), { duration: 5000 });
  };

  const handleMintUsdc = async () => {
    if (!isConnected) return toast.error('Hubungkan wallet!');
    setLoadingUsdc(true);
    const toastId = toast.loading('Memproses...', { style: { fontSize: '13px' } });
    try {
      const tx = await usdcContract.mint(account, parseUsdc(1000));
      const receipt = await tx.wait();
      setLastUsdcTx(receipt.transactionHash);
      toast.dismiss(toastId);
      showSuccessToast('USDC', '1,000 USDC', receipt.transactionHash, 'blue');
    } catch (err) {
      toast.dismiss(toastId);
      showErrorToast(err.message.includes('owner') ? 'Admin Only' : 'Gagal cetak USDC');
    } finally {
      setLoadingUsdc(false);
    }
  };

  const handleRequestEth = async () => {
    if (!isConnected) return toast.error('Hubungkan wallet!');
    setLoadingEth(true);
    const toastId = toast.loading('Memproses...', { style: { fontSize: '13px' } });
    try {
      const res = await requestEthFaucet(account);
      setLastEthTx(res.txHash);
      toast.dismiss(toastId);
      showSuccessToast('ETH', '0.05 ETH', res.txHash, 'gold');
    } catch (err) {
      toast.dismiss(toastId);
      const errorMsg = err.response?.data?.error || err.message || 'Gagal klaim ETH';
      showErrorToast(errorMsg);
    } finally {
      setLoadingEth(false);
    }
  };

  return (
    <div className="faucet-page gradient-bg">
      <div className="faucet-container">
        {/* Top-Right External Links */}
        <div className="faucet-external-nav">
          <span className="nav-title">Official Faucets:</span>
          <a href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia" target="_blank" rel="noreferrer">Google</a>
          <a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer">Alchemy</a>
          <a href="https://www.infura.io/faucet/sepolia" target="_blank" rel="noreferrer">Infura</a>
        </div>

        {/* Header Section */}
        <header className="faucet-header text-center animate-fade-in">
          <h1 className="faucet-title">Dapatkan <span className="gradient-text">Faucet</span></h1>
          <p className="faucet-subtitle">
            Gunakan Saldo Berikut Untuk Mencoba Fitur Pembuatan Kampanye Dan Donasi Menggunakan USDC Dan ETH Sepolia Untuk Gasfee.
          </p>
        </header>

        {/* Faucet Grid */}
        <div className="faucet-grid-modern animate-slide-up">
          {/* Mock USDC Card */}
          <div className="faucet-card-modern glass-card-hover">
            <div className="faucet-icon-circle blue">
              <img 
                src="/usdc.png" 
                alt="USDC Logo" 
                className="faucet-logo-img"
              />
            </div>
            <div className="faucet-content">
              <h3>USDC</h3>
              <p>Token yang digunakan sebagai alat donasi utama di platform.</p>

              <div className="faucet-stats">
                <span>1,000 USDC / Klaim</span>
              </div>

              <div className="usdc-address-box" onClick={() => handleCopyAddress(usdcAddress)}>
                <span className="address-label">Contract Address:</span>
                <span className="address-value monospace">
                  {usdcAddress?.slice(0, 10)}...{usdcAddress?.slice(-8)}
                  <Copy size={13} style={{ marginLeft: 8, opacity: 0.6 }} />
                </span>
              </div>
            </div>
            <div className="faucet-footer-action">
              <button
                className="faucet-btn blue-btn"
                onClick={isConnected ? handleMintUsdc : openSafeConnectModal}
                disabled={loadingUsdc}
              >
                {loadingUsdc
                  ? <span className="spinner"></span>
                  : isConnected
                    ? 'Mint 1,000 USDC'
                    : <><Wallet size={15} style={{ marginRight: 6 }} />Hubungkan Wallet</>}
              </button>
              {lastUsdcTx && (
                <a href={`https://sepolia.etherscan.io/tx/${lastUsdcTx}`} target="_blank" rel="noreferrer" className="tx-status-mini">
                  Terkonfirmasi
                </a>
              )}
            </div>
          </div>

          {/* Sepolia ETH Card */}
          <div className="faucet-card-modern glass-card-hover gold">
            <div className="faucet-icon-circle gold">
              <img 
                src="/eth.png" 
                alt="ETH Logo" 
                className="faucet-logo-img"
              />
            </div>
            <div className="faucet-content">
              <h3>Sepolia ETH</h3>
              <p>Bantuan gas fee gratis agar anda bisa langsung bertransaksi di jaringan testnet.</p>
              <div className="faucet-stats">
                <span>0.05 ETH / Klaim Sekali</span>
              </div>
            </div>
            <div className="faucet-footer-action">
              <button
                className="faucet-btn gold-btn"
                onClick={isConnected ? handleRequestEth : openSafeConnectModal}
                disabled={loadingEth}
              >
                {loadingEth
                  ? <span className="spinner"></span>
                  : isConnected
                    ? 'Claim 0.05 ETH Sepolia'
                    : <><Wallet size={15} style={{ marginRight: 6 }} />Hubungkan Wallet</>}
              </button>
              {lastEthTx && (
                <a href={`https://sepolia.etherscan.io/tx/${lastEthTx}`} target="_blank" rel="noreferrer" className="tx-status-mini">
                  <CheckCircle size={12} /> Proses Pengiriman
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
