import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';

// Definisi chain Hardhat Local
const hardhatLocal = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'ChainDonate',
  projectId: 'chaindonate-local-dev', // WalletConnect project ID (opsional untuk local dev)
  chains: [hardhatLocal],
  transports: {
    [hardhatLocal.id]: http('http://127.0.0.1:8545'),
  },
});

export { hardhatLocal };
