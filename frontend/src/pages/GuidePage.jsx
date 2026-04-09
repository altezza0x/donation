import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Download, Globe, Coins, ArrowRight, CheckCircle,
  ShieldCheck, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  ExternalLink, Heart, Eye, Zap, Lock, HelpCircle, BookOpen, Star
} from 'lucide-react';
import './GuidePage.css';

const STEPS = [
  {
    id: 1,
    icon: Download,
    title: 'Install MetaMask',
    shortTitle: 'MetaMask',
    accentColor: '#f59e0b',
    accentRgb: '245,158,11',
    description: 'MetaMask adalah dompet digital (wallet) berbentuk ekstensi browser. Ini adalah paspor Anda untuk berinteraksi di dunia blockchain dengan aman dan gratis.',
    substeps: [
      { text: 'Buka browser (Chrome, Brave, atau Firefox)' },
      { text: 'Kunjungi situs resmi metamask.io dan klik "Download"' },
      { text: 'Install ekstensi dan ikuti proses pembuatan dompet baru' },
      { text: 'Catat "Secret Recovery Phrase" (12 kata rahasia) di kertas dan simpan di tempat aman' },
      { text: 'Buat password untuk mengunci ekstensi MetaMask Anda' },
    ],
    warning: 'JANGAN PERNAH membagikan Secret Recovery Phrase (12 kata) kepada siapapun. Itu adalah kunci utama uang Anda!',
    links: [
      { label: 'Buka metamask.io', href: 'https://metamask.io/download/', target: '_blank' },
    ],
  },
  {
    id: 2,
    icon: Globe,
    title: 'Pilih Jaringan Sepolia',
    shortTitle: 'Jaringan',
    accentColor: '#22d3ee',
    accentRgb: '34,211,238',
    description: 'Platform kami menggunakan Sepolia Testnet, yaitu jaringan uji coba Ethereum. Di sini, Anda bisa berdonasi tanpa menggunakan uang asli (bebas risiko).',
    substeps: [
      { text: 'Klik ikon MetaMask di pojok kanan atas browser Anda' },
      { text: 'Klik tulisan jaringan di bagian paling atas (biasanya "Ethereum Mainnet")' },
      { text: 'Aktifkan opsi "Show test networks" (Tampilkan jaringan percobaan)' },
      { text: 'Pilih "Sepolia" dari daftar yang muncul' },
      { text: 'Pastikan nama jaringan di atas sudah berubah menjadi Sepolia' },
    ],
    tip: 'Jika Sepolia tidak ada di daftar, buka Settings → Advanced → Aktifkan "Show test networks".',
  },
  {
    id: 3,
    icon: Coins,
    title: 'Dapatkan Token Gratis',
    shortTitle: 'Faucet',
    accentColor: '#34d399',
    accentRgb: '52,211,153',
    description: 'Anda butuh saldo untuk berdonasi. Kami menyediakan token USDC (untuk donasi) dan ETH (untuk biaya gas transaksi) secara gratis melalui fitur Faucet.',
    substeps: [
      { text: 'Klik menu "Faucet" di bagian atas halaman web ini' },
      { text: 'Hubungkan wallet MetaMask Anda jika diminta' },
      { text: 'Klik "Mint 1,000 USDC" untuk mengambil saldo donasi' },
      { text: 'Klik "Claim 0.05 ETH" untuk mengambil biaya transaksi' },
      { text: 'Tunggu notifikasi sukses (berwarna hijau)' },
    ],
    tip: 'ETH Sepolia hanya dipotong sedikit setiap kali Anda bertransaksi. Anda hanya perlu mengambilnya sekali.',
    links: [
      { label: 'Pergi ke Halaman Faucet', href: '/faucet', internal: true },
    ],
  },
  {
    id: 4,
    icon: Wallet,
    title: 'Hubungkan & Daftar',
    shortTitle: 'Registrasi',
    accentColor: '#818cf8',
    accentRgb: '129,140,248',
    description: 'Setelah dompet Anda terisi, hubungkan dompet tersebut ke ChainDonate agar sistem kami dapat mengenali Anda sebagai donatur.',
    substeps: [
      { text: 'Klik tombol "Hubungkan Wallet" di pojok kanan atas layar' },
      { text: 'Pilih MetaMask dan setujui (Confirm) popup yang muncul' },
      { text: 'Sistem akan meminta Anda untuk mendaftar profil singkat' },
      { text: 'Isi nama panggilan (opsional: email) agar pembuat kampanye bisa mengenali Anda' },
      { text: 'Klik "Daftar Sekarang" dan profil Anda siap digunakan!' },
    ],
  },
  {
    id: 5,
    icon: Heart,
    title: 'Mulai Berdonasi!',
    shortTitle: 'Donasi',
    accentColor: '#f43f5e',
    accentRgb: '244,63,94',
    description: 'Anda sudah sepenuhnya siap! Pilih kampanye yang menyentuh hati Anda dan jadilah bagian dari perubahan, dicatat secara abadi di blockchain.',
    substeps: [
      { text: 'Klik menu "Kampanye" untuk melihat daftar penggalangan dana' },
      { text: 'Pilih salah satu kampanye dan klik "Donasi Sekarang"' },
      { text: 'Ketik nominal USDC yang ingin Anda sumbangkan' },
      { text: 'Setujui transaksi di jendela MetaMask yang muncul' },
      { text: 'Lihat donasi Anda langsung tercatat di halaman Transparansi!' },
    ],
    tip: 'Sistem blockchain memastikan rekam jejak donasi Anda 100% transparan dan tidak dapat dihapus oleh pihak manapun.',
    links: [
      { label: 'Lihat Daftar Kampanye', href: '/campaigns', internal: true },
    ],
  },
];

const FAQ = [
  {
    q: 'Apakah uang saya aman di ChainDonate?',
    a: 'Sangat aman. Dana donasi dikelola otomatis oleh Smart Contract yang kodenya bersifat publik. Tim ChainDonate tidak bisa menyentuh, membekukan, atau mengubah aliran dana tanpa persetujuan blockchain.',
  },
  {
    q: 'Apakah saya menggunakan uang rupiah asli?',
    a: 'Tidak. Saat ini platform beroperasi di jaringan Sepolia (jaringan simulasi). Token yang digunakan adalah token percobaan gratis. Sangat cocok untuk Anda yang baru belajar berdonasi via Web3 tanpa risiko kehilangan uang.',
  },
  {
    q: 'Apa itu Gas Fee / Biaya Gas?',
    a: 'Dalam blockchain, setiap tindakan (seperti mengirim donasi) membutuhkan tenaga komputasi kecil yang disebut "Gas". Anda membayarnya menggunakan ETH. Di Sepolia, ETH ini bisa didapatkan gratis di halaman Faucet.',
  },
  {
    q: 'Bagaimana cara melacak donasi saya?',
    a: 'Karena berjalan di blockchain publik, Anda bisa melihat ke halaman "Transparansi" di web ini, atau melacak langsung riwayat "Tx Hash" Anda melalui situs penjelajah global seperti Sepolia Etherscan.',
  },
];

export default function GuidePage() {
  const [activeStep, setActiveStep] = useState(1);
  const [openFaq, setOpenFaq] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Fungsi navigasi step dengan transisi smooth
  const changeStep = (newStep) => {
    if (newStep === activeStep || newStep < 1 || newStep > STEPS.length) return;
    setIsAnimating(true);
    setTimeout(() => {
      setActiveStep(newStep);
      setIsAnimating(false);
    }, 300); // durasi fade out
  };

  const currentStepData = STEPS.find(s => s.id === activeStep);
  const CurrentIcon = currentStepData.icon;

  return (
    <div className="guide-page-modern">
      
      {/* ── HERO BANNER ── */}
      <section className="guide-hero-modern">
        <div className="bg-glow bg-glow-left" />
        <div className="bg-glow bg-glow-right" />
        
        <div className="container guide-hero-content">
          <div className="badge-modern">
            <BookOpen size={14} /> Pusat Pembelajaran
          </div>
          <h1 className="title-modern">
            Berkenalan dengan <span className="gradient-text">Donasi Blockchain</span>
          </h1>
          <p className="subtitle-modern">
            Tak perlu keahlian teknis. Kami memandu Anda dari nol hingga berhasil mengirimkan 
            donasi terdesentralisasi pertama Anda dalam hitungan menit.
          </p>
        </div>
      </section>

      <div className="container guide-main-container">
        
        {/* ── INTERACTIVE GUIDE TRACKER ── */}
        <div className="guide-interactive-wrapper glass-panel">
          
          {/* Timeline Navigation */}
          <div className="step-navigator">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const isPassed = activeStep > step.id;
              const StepIconNav = step.icon;
              
              return (
                <div 
                  key={step.id} 
                  className={`nav-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                  onClick={() => changeStep(step.id)}
                >
                  <div 
                    className="nav-icon-circle" 
                    style={{ 
                      borderColor: isActive || isPassed ? step.accentColor : 'var(--border-subtle)',
                      background: isActive ? `rgba(${step.accentRgb}, 0.15)` : isPassed ? step.accentColor : 'transparent',
                      color: isActive ? step.accentColor : isPassed ? '#fff' : 'var(--text-muted)'
                    }}
                  >
                    {isPassed ? <CheckCircle size={16} /> : <StepIconNav size={16} />}
                  </div>
                  <span className="nav-label">{step.shortTitle}</span>
                  {/* Garis penghubung antar step */}
                  {step.id !== STEPS.length && <div className="nav-line" />}
                </div>
              );
            })}
          </div>

          {/* Active Step Content */}
          <div className={`step-content-display ${isAnimating ? 'fade-out' : 'fade-in'}`}>
            <div className="step-content-header" style={{ borderBottomColor: `rgba(${currentStepData.accentRgb}, 0.2)` }}>
              <div 
                className="step-content-icon" 
                style={{ background: `linear-gradient(135deg, ${currentStepData.accentColor}, rgba(${currentStepData.accentRgb}, 0.5))` }}
              >
                <CurrentIcon size={32} color="#fff" />
              </div>
              <div className="step-content-titles">
                <span className="step-counter" style={{ color: currentStepData.accentColor }}>
                  TAHAP {currentStepData.id} DARI {STEPS.length}
                </span>
                <h2 className="step-main-title">{currentStepData.title}</h2>
              </div>
            </div>

            <div className="step-content-body">
              <p className="step-description">{currentStepData.description}</p>
              
              <div className="step-action-list">
                <h4 className="list-title">Panduan Eksekusi:</h4>
                <ul className="custom-list">
                  {currentStepData.substeps.map((sub, idx) => (
                    <li key={idx}>
                      <div 
                        className="number-bullet" 
                        style={{ 
                          background: `rgba(${currentStepData.accentRgb}, 0.15)`,
                          color: currentStepData.accentColor,
                          borderColor: `rgba(${currentStepData.accentRgb}, 0.4)`
                        }}
                      >
                        {idx + 1}
                      </div>
                      <span className="list-text">{sub.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Notice Boxes */}
              <div className="step-notices">
                {currentStepData.warning && (
                  <div className="notice-box warning">
                    <ShieldCheck size={20} className="notice-icon" />
                    <div className="notice-text">
                      <strong>PENTING:</strong> {currentStepData.warning}
                    </div>
                  </div>
                )}
                
                {currentStepData.tip && (
                  <div className="notice-box info" style={{ borderColor: `rgba(${currentStepData.accentRgb}, 0.3)`, background: `rgba(${currentStepData.accentRgb}, 0.05)`}}>
                    <Zap size={20} style={{ color: currentStepData.accentColor }} className="notice-icon" />
                    <div className="notice-text">
                      <strong style={{ color: currentStepData.accentColor }}>TIPS:</strong> <span style={{ opacity: 0.9 }}>{currentStepData.tip}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="step-navigation-buttons">
                <button 
                  className="btn-nav btn-prev" 
                  onClick={() => changeStep(activeStep - 1)}
                  disabled={activeStep === 1 || isAnimating}
                >
                  <ChevronLeft size={18} /> Sebelumnya
                </button>

                <div className="step-external-actions">
                  {currentStepData.links?.map((link, idx) => (
                    link.internal ? (
                      <Link 
                        key={idx} 
                        to={link.href} 
                        className="btn-action primary"
                        style={{ background: currentStepData.accentColor, boxShadow: `0 4px 14px rgba(${currentStepData.accentRgb}, 0.3)` }}
                      >
                        {link.label} <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <a 
                        key={idx} 
                        href={link.href} 
                        target={link.target} 
                        className="btn-action primary"
                        style={{ background: currentStepData.accentColor, boxShadow: `0 4px 14px rgba(${currentStepData.accentRgb}, 0.3)` }}
                      >
                        {link.label} <ExternalLink size={16} />
                      </a>
                    )
                  ))}
                </div>

                <button 
                  className="btn-nav btn-next" 
                  onClick={() => changeStep(activeStep + 1)}
                  disabled={activeStep === STEPS.length || isAnimating}
                >
                  Berikutnya <ChevronRight size={18} />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── FAQ SECTION ── */}
        <section className="faq-modern-section">
          <div className="faq-header-center">
            <h2 className="faq-title">Anda Bertanya, <span className="gradient-text">Kami Menjawab</span></h2>
          </div>
          
          <div className="faq-grid">
            {FAQ.map((item, i) => (
              <div 
                key={i} 
                className={`faq-card ${openFaq === i ? 'open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="faq-card-header">
                  <h3>{item.q}</h3>
                  <div className="faq-toggle-icon">
                    {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
                <div className="faq-card-body">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
