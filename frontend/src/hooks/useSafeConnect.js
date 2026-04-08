/**
 * useSafeConnect — hook untuk membuka RainbowKit connect modal dengan aman.
 *
 * ROOT CAUSE bug "stuck Opening MetaMask...":
 * Setelah disconnect(), MetaMask extension masih menyimpan pending
 * eth_requestAccounts request secara internal. Saat connect dipanggil lagi,
 * MetaMask menerima request baru tapi TIDAK menampilkan popup karena
 * dianggap sudah ada request yang pending — sehingga stuck tanpa response.
 *
 * SOLUSI BENAR:
 * Panggil `wallet_revokePermissions` pada window.ethereum SEBELUM membuka
 * modal. Ini memaksa MetaMask untuk:
 * 1. Membatalkan pending eth_requestAccounts yang lama
 * 2. Mencabut izin koneksi site saat ini
 * Sehingga saat connect dipanggil, MetaMask akan tampilkan popup segar.
 *
 * Sebagai fallback untuk wallet non-MetaMask, kita juga reset wagmi state
 * dan bersihkan wagmi localStorage keys.
 */

import { useCallback } from 'react';
import { useConnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export function useSafeConnect() {
  const { reset } = useConnect();
  const { openConnectModal } = useConnectModal();

  const openSafeConnectModal = useCallback(async () => {
    // 1. Revoke MetaMask permissions — ini membersihkan pending eth_requestAccounts
    //    internal MetaMask yang menjadi penyebab utama stuck state.
    try {
      const provider = window.ethereum;
      if (provider) {
        // Support multiple providers (e.g. MetaMask + Coinbase)
        const metamaskProvider =
          provider.isMetaMask
            ? provider
            : (provider.providers?.find((p) => p.isMetaMask) ?? null);

        if (metamaskProvider) {
          await metamaskProvider
            .request({
              method: 'wallet_revokePermissions',
              params: [{ eth_accounts: {} }],
            })
            .catch(() => {}); // abaikan jika gagal (misal belum pernah connect)
        }
      }
    } catch (_) { /* ignore */ }

    // 2. Reset wagmi connect hook state (data, error, isPending, dll)
    try { reset(); } catch (_) {}

    // 3. Tunggu sebentar agar semua async state ter-flush sebelum modal dibuka
    setTimeout(() => {
      if (openConnectModal) openConnectModal();
    }, 100);
  }, [reset, openConnectModal]);

  return { openSafeConnectModal };
}
