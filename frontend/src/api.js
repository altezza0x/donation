/**
 * Helper API untuk komunikasi ke backend ChainDonate
 * Base URL: /api (di-proxy Vite ke http://localhost:3001)
 */

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ── TX Hash ────────────────────────────────────────────────────────────────

/**
 * Simpan tx hash ke backend MongoDB
 * @param {'campaign'|'donation'|'withdrawal'} type
 * @param {string} refId  - campaignId, donationId, atau "campaignId-timestamp"
 * @param {string} txHash - tx hash string (0x...)
 */
export async function saveTxHash(type, refId, txHash) {
  try {
    await fetch(`${API_BASE}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, refId: String(refId), txHash }),
    });
  } catch (err) {
    console.warn(`[API] Gagal simpan tx hash (${type}/${refId}):`, err.message);
  }
}

/**
 * Ambil tx hash dari backend MongoDB
 * @returns {Promise<string|null>} txHash atau null jika tidak ditemukan
 */
export async function getTxHash(type, refId) {
  try {
    const res = await fetch(`${API_BASE}/tx/${type}/${refId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.txHash || null;
  } catch (err) {
    console.warn(`[API] Gagal ambil tx hash (${type}/${refId}):`, err.message);
    return null;
  }
}

/**
 * Ambil semua tx hash dari backend MongoDB
 * @returns {Promise<Array>} array of { type, refId, txHash }
 */
export async function getAllTxHashes() {
  try {
    const res = await fetch(`${API_BASE}/tx/all`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('[API] Gagal ambil semua tx hash:', err.message);
    return [];
  }
}

// ── User Profile ───────────────────────────────────────────────────────────

/**
 * Simpan profil user ke backend MongoDB
 */
export async function saveUserProfile(userData) {
  try {
    await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  } catch (err) {
    console.warn('[API] Gagal simpan profil user:', err.message);
  }
}

/**
 * Ambil profil user dari backend MongoDB berdasarkan wallet address
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(wallet) {
  try {
    const res = await fetch(`${API_BASE}/users/${wallet.toLowerCase()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    console.warn('[API] Gagal ambil profil user:', err.message);
    return null;
  }
}
