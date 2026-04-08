import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { sepolia, hardhat } from 'wagmi/chains';
import {
  metaMaskWallet,
  injectedWallet,
  walletConnectWallet,
  trustWallet,
  coinbaseWallet,
  ledgerWallet,
  okxWallet,
  zerionWallet,
  rainbowWallet,
  rabbyWallet
} from '@rainbow-me/rainbowkit/wallets';

// Deteksi network dari .env
const networkId = parseInt(import.meta.env.VITE_NETWORK_ID || '31337');
const isTestnet = networkId === 11155111;

// Override ikon Sepolia agar terlihat lebih bagus di modal RainbowKit
const sepoliaCustom = {
  ...sepolia,
  iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  iconBackground: '#ffffff',
};

// Gunakan chain yang sesuai
const activeChain = isTestnet ? sepoliaCustom : hardhat;

// RPC URL
const rpcUrl = isTestnet
  ? (import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org')
  : 'http://127.0.0.1:8545';

// Konfigurasi wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Rekomendasi',
      wallets: [rainbowWallet, metaMaskWallet, rabbyWallet, trustWallet, okxWallet, walletConnectWallet],
    },
    {
      groupName: 'Lainnya',
      wallets: [coinbaseWallet, zerionWallet, injectedWallet, ledgerWallet],
    },
  ],
  {
    appName: 'ChainDonate',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'da146c62064c23627e38077de9004808',
  }
);

export const config = createConfig({
  chains: [activeChain],
  connectors,
  // Matikan multicall batching. Wagmi menggabungkan readContract ke batch Multicall3
  // yang kadang di-timeout oleh RPC tanpa men-reject promise → loading hang selamanya.
  batch: { multicall: false },
  transports: {
    [activeChain.id]: http(rpcUrl),
  },
  multiInjectedProviderDiscovery: true,
});

export { activeChain as chain };
