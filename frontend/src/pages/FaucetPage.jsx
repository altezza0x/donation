import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { formatUsdc, parseUsdc } from '../contracts/MockUSDC';
import { Wallet, Droplets, ArrowRight, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Coins, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import './FaucetPage.css';

export default function FaucetPage() {
  const { account, isConnected, usdcContract, networkId, shortAddress, publicClient } = useWeb3();
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastMintTx, setLastMintTx] = useState(null);
  const [activeTab, setActiveTab] = useState('usdc');

  const fetchBalances = async () => {
    if (!account) return;
    setRefreshing(true);
    try {
      // Fetch USDC
      if (usdcContract) {
        const b = await usdcContract.balanceOf(account);
        setUsdcBalance(formatUsdc(b).toFixed(2));
      }
      // Fetch ETH
      if (publicClient) {
        const eb = await publicClient.getBalance({ address: account });
        setEthBalance((Number(eb) / 1e18).toFixed(4));
      }
    } catch (err) {
      console.error('Gagal ambil saldo:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [account, usdcContract, publicClient]);

  const handleMint = async () => {
    if (!isConnected) {
      toast.error('Hubungkan wallet terlebih dahulu!');
      return;
    }
    
    setLoading(true);
    const amount = parseUsdc(1000);
    const toastId = toast.loading('Meminta 1,000 USDC dari faucet...');

    try {
      const tx = await usdcContract.mint(account, amount);
      toast.loading('Menunggu konfirmasi blockchain...', { id: toastId });
      const receipt = await tx.wait();
      setLastMintTx(receipt.transactionHash);
      toast.success('1,000 USDC berhasil ditambahkan!', { id: toastId, duration: 6000 });
      fetchBalances();
    } catch (err) {
      console.error('Mint error:', err);
      const msg = err.message.toLowerCase().includes('owner') 
        ? 'Kontrak Mock masih terkunci (Owner Only). Hubungi admin.' 
        : (err.reason || 'Gagal mengambil USDC gratis.');
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const externalFaucets = [
    { name: 'Google Faucet', url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia', desc: '0.05 Sepolia ETH harian' },
    { name: 'Alchemy Faucet', url: 'https://sepoliafaucet.com/', desc: '0.5 Sepolia ETH (butuh login)' },
    { name: 'Infura Faucet', url: 'https://www.infura.io/faucet/sepolia', desc: '0.1 Sepolia ETH harian' },
    { name: 'QuickNode', url: 'https://faucet.quicknode.com/ethereum/sepolia', desc: 'Bantuan instan di Sepolia' },
  ];

  return (
    <div className="faucet-page gradient-bg">
      <div className="container">
        <div className="faucet-hero">
          <div className="faucet-chip">
            <Droplets size={14} />
            <span>Testnet Faucet Hub</span>
          </div>
          <h1 className="faucet-title">Pusat Bantuan <span className="gradient-text">Testing</span></h1>
          <p className="faucet-desc">
            Dapatkan saldo uji untuk berinteraksi dengan platform kami tanpa menggunakan aset sungguhan.
          </p>
        </div>

        <div className="faucet-tabs-container">
          <div className="faucet-tabs">
            <button 
              className={`faucet-tab ${activeTab === 'usdc' ? 'active' : ''}`}
              onClick={() => setActiveTab('usdc')}
            >
              <Coins size={16} />
              Mock USDC
            </button>
            <button 
              className={`faucet-tab ${activeTab === 'eth' ? 'active' : ''}`}
              onClick={() => setActiveTab('eth')}
            >
              <Droplets size={16} />
              Sepolia ETH
            </button>
          </div>
        </div>

        <div className="faucet-card glass-card">
          <div className="faucet-card-header">
            <div className="wallet-pill">
              <Wallet size={16} />
              <span className="monospace">{isConnected ? shortAddress : 'Hubungkan Wallet'}</span>
            </div>
            {isConnected && (
              <button 
                className={`refresh-btn ${refreshing ? 'spinning' : ''}`} 
                onClick={fetchBalances} 
                disabled={refreshing}
                title="Update Saldo"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <div className="faucet-main">
            {activeTab === 'usdc' ? (
              <div className="faucet-content animate-fade">
                <div className="balance-section">
                  <p className="balance-label">Saldo Mock USDC</p>
                  <h2 className="balance-value">
                    {Number(usdcBalance).toLocaleString()} <span className="currency">USDC</span>
                  </h2>
                </div>

                <div className="mint-action">
                  <div className="faucet-info-box">
                    <Zap size={20} className="info-icon" />
                    <div className="info-text">
                      <strong>Cetak Langsung Ke Wallet</strong>
                      <p>Dapatkan 1,000 USDC Mock seketika melalui kontrak kami.</p>
                    </div>
                  </div>

                  {!isConnected ? (
                    <div className="faucet-not-connected">
                      <p>Hubungkan wallet untuk mencetak token USDC secara gratis.</p>
                    </div>
                  ) : (
                    <button className="faucet-submit-btn" onClick={handleMint} disabled={loading}>
                      {loading ? (
                        <div className="spinner-wrap"><div className="spinner" /> <span>Sedang Diproses...</span></div>
                      ) : (
                        <><span>Ambil 1,000 USDC</span> <ArrowRight size={18} /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="faucet-content animate-fade">
                <div className="balance-section">
                  <p className="balance-label">Saldo Sepolia ETH</p>
                  <h2 className="balance-value">
                    {ethBalance} <span className="currency">ETH</span>
                  </h2>
                </div>

                <div className="eth-faucet-list">
                  <p className="eth-notice">
                    <AlertCircle size={14} />
                    ETH diperlukan sebagai biaya gas (biaya jaringan) untuk setiap transaksi di Sepolia.
                  </p>
                  <div className="faucet-grid">
                    {externalFaucets.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noreferrer" className="external-faucet-card">
                        <div className="ef-content">
                          <span className="ef-name">{f.name}</span>
                          <span className="ef-desc">{f.desc}</span>
                        </div>
                        <ExternalLink size={14} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {lastMintTx && activeTab === 'usdc' && (
            <div className="mint-success-msg">
              <CheckCircle size={16} color="var(--success-400)" />
              <span>Berhasil!</span>
              <a 
                href={networkId === '11155111' ? `https://sepolia.etherscan.io/tx/${lastMintTx}` : '#'} 
                target="_blank" rel="noreferrer" className="tx-link"
              >
                Lihat Detail <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        <div className="faucet-faq">
          <div className="faq-item">
            <h4>Bagaimana cara mendapatkan ETH?</h4>
            <p>Berbeda dengan USDC, platform kami tidak dapat mencetak ETH. Anda harus mengklaimnya melalui faucet eksternal yang disediakan oleh Google, Alchemy, atau Infura dengan memasukkan alamat wallet Anda di situs tersebut.</p>
          </div>
          {networkId === '31337' && (
            <div className="faq-item success-box">
              <h4>Mode Localhost Terdeteksi</h4>
              <p>Di jaringan lokal (Hardhat), akun Anda biasanya sudah dibekali 10,000 ETH saat node baru dinyalakan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
