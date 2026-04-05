import { useState, useEffect, useMemo, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import CampaignCard from '../components/CampaignCard';
import { Search, Filter, Inbox, ChevronDown } from 'lucide-react';
import './CampaignsPage.css';

const CATEGORIES = ['Semua', 'Pendidikan', 'Kesehatan', 'Bencana Alam', 'Keagamaan', 'Sosial', 'Lainnya'];
const SORTS = [
  { value: 'newest',   label: 'Terbaru' },
  { value: 'popular',  label: 'Terpopuler' },
  { value: 'progress', label: 'Progress Tertinggi' },
  { value: 'target',   label: 'Target Tertinggi' },
];

export default function CampaignsPage() {
  const { readOnlyContract, isConnected } = useWeb3();
  const [campaigns, setCampaigns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [sort, setSort] = useState('newest');
  const [showActive, setShowActive] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!readOnlyContract) { setLoading(false); return; }
      try {
        const all = await readOnlyContract.getAllCampaigns();
        setCampaigns([...all]);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [readOnlyContract]);

  const filtered = useMemo(() => {
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

    return result;
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
            Semua Kampanye Terdaftar di Blockchain. Setiap Donasi Tercatat Transparan dan Dapat Dilacak.
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

          {/* Sort — custom dropdown */}
          <div className="sort-dropdown" ref={sortRef}>
            <button
              className={`sort-trigger ${sortOpen ? 'open' : ''}`}
              onClick={() => setSortOpen(v => !v)}
              type="button"
            >
              <span>{SORTS.find(x => x.value === sort)?.label}</span>
              <ChevronDown size={14} className={`sort-chevron ${sortOpen ? 'rotated' : ''}`} />
            </button>

            {sortOpen && (
              <div className="sort-menu">
                {SORTS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`sort-item ${sort === value ? 'active' : ''}`}
                    onClick={() => { setSort(value); setSortOpen(false); }}
                    type="button"
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
        {loading ? (
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
