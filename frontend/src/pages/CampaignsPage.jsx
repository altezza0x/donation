import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import CampaignCard from '../components/CampaignCard';
import { Search, Filter, LayoutGrid, List, Inbox } from 'lucide-react';
import './CampaignsPage.css';

const CATEGORIES = ['Semua', 'Pendidikan', 'Kesehatan', 'Bencana Alam', 'Keagamaan', 'Sosial', 'Lainnya'];
const SORTS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'popular', label: 'Terpopuler' },
  { value: 'progress', label: 'Progress Tertinggi' },
  { value: 'target', label: 'Target Tertinggi' },
];

export default function CampaignsPage() {
  const { contract, isConnected } = useWeb3();
  const [campaigns, setCampaigns] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [sort, setSort] = useState('newest');
  const [showActive, setShowActive] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!contract) { setLoading(false); return; }
      try {
        const all = await contract.getAllCampaigns();
        setCampaigns([...all]);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [contract]);

  useEffect(() => {
    const now = Date.now() / 1000;
    let result = [...campaigns];

    // Filter active
    if (showActive) result = result.filter(c => c.isActive && Number(c.deadline) > now);

    // Category filter
    if (category !== 'Semua') result = result.filter(c => c.category === category);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sort === 'newest') return Number(b.createdAt) - Number(a.createdAt);
      if (sort === 'popular') return Number(b.donorCount) - Number(a.donorCount);
      if (sort === 'progress') {
        const progA = Number(a.raisedAmount) / Number(a.targetAmount);
        const progB = Number(b.raisedAmount) / Number(b.targetAmount);
        return progB - progA;
      }
      if (sort === 'target') return Number(b.targetAmount) - Number(a.targetAmount);
      return 0;
    });

    setFiltered(result);
  }, [campaigns, search, category, sort, showActive]);

  return (
    <div className="campaigns-page">
      {/* Header */}
      <div className="campaigns-header">
        <div className="campaigns-header-bg" />
        <div className="container">
          <span className="section-tag">Kampanye Donasi</span>
          <h1 className="campaigns-page-title">
            Temukan Kampanye yang <span className="gradient-text">Menginspirasi</span>
          </h1>
          <p className="campaigns-page-desc">
            Semua kampanye terdaftar di blockchain Ethereum. Setiap donasi tercatat transparan dan dapat dilacak.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Filters */}
        <div className="campaigns-filters">
          {/* Search */}
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Cari kampanye..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)} className="filter-select">
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Active toggle */}
          <button
            className={`filter-toggle ${showActive ? 'active' : ''}`}
            onClick={() => setShowActive(!showActive)}
          >
            <Filter size={14} />
            {showActive ? 'Aktif Saja' : 'Semua Status'}
          </button>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results info */}
        {!loading && (
          <p className="results-count">
            Menampilkan <strong>{filtered.length}</strong> kampanye
            {category !== 'Semua' && ` di kategori ${category}`}
            {search && ` untuk "${search}"`}
          </p>
        )}

        {/* Content */}
        {!isConnected ? (
          <div className="campaigns-notice">
            <h2>Hubungkan MetaMask</h2>
            <p>Koneksikan wallet untuk melihat kampanye dari blockchain.</p>
          </div>
        ) : loading ? (
          <div className="campaigns-grid-page">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton" style={{ height: 360 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-campaigns">
            <Inbox size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <h3>Tidak ada kampanye ditemukan</h3>
            <p>Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="campaigns-grid-page">
            {filtered.map(c => (
              <CampaignCard key={c.id.toString()} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
