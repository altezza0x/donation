import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useDisconnect, useConnect } from 'wagmi';
import { DONATION_SYSTEM_ABI, CONTRACT_ADDRESS } from '../contracts/DonationSystem';
import { MOCK_USDC_ABI, USDC_ADDRESS } from '../contracts/MockUSDC';
import { getUserProfile } from '../api';
import toast from 'react-hot-toast';

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
  const { address, isConnected, isConnecting, connector } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { reset: resetConnect } = useConnect();

  const [user, setUser] = useState(null);
  const [contract, setContract] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isContractOwner, setIsContractOwner] = useState(false);
  const [isOwnerLoaded, setIsOwnerLoaded] = useState(false);
  const [isVerifiedCreator, setIsVerifiedCreator] = useState(false);

  // Read-only contract: selalu tersedia selama publicClient ada (tidak perlu koneksi wallet)
  const [readOnlyContract, setReadOnlyContract] = useState(null);
  // USDC contracts
  const [usdcContract, setUsdcContract] = useState(null);
  const [readOnlyUsdcContract, setReadOnlyUsdcContract] = useState(null);

  // Read-only USDC contract
  useEffect(() => {
    if (!publicClient || !USDC_ADDRESS) {
      setReadOnlyUsdcContract(null);
      return;
    }
    const readOnly = createContractWrapper(publicClient, null, USDC_ADDRESS, MOCK_USDC_ABI);
    setReadOnlyUsdcContract(readOnly);
  }, [publicClient]);

  // Write USDC contract (hanya bila wallet terkoneksi)
  useEffect(() => {
    if (!publicClient || !isConnected || !USDC_ADDRESS) {
      setUsdcContract(null);
      return;
    }
    const usdcWrapper = createContractWrapper(publicClient, walletClient, USDC_ADDRESS, MOCK_USDC_ABI);
    setUsdcContract(usdcWrapper);
  }, [publicClient, walletClient, isConnected]);

  // Read-only DonationSystem contract
  useEffect(() => {
    if (!publicClient || !CONTRACT_ADDRESS) {
      setReadOnlyContract(null);
      return;
    }
    const readOnly = createContractWrapper(publicClient, null, CONTRACT_ADDRESS, DONATION_SYSTEM_ABI);
    setReadOnlyContract(readOnly);
  }, [publicClient]);

  // Write DonationSystem contract (hanya bila wallet terkoneksi)
  useEffect(() => {
    if (!publicClient || !isConnected || !CONTRACT_ADDRESS) {
      setContract(null);
      return;
    }
    const contractWrapper = createContractWrapper(publicClient, walletClient, CONTRACT_ADDRESS, DONATION_SYSTEM_ABI);
    setContract(contractWrapper);
  }, [publicClient, walletClient, isConnected]);

  // Load user data saat connect
  const loadUser = useCallback(async (addr) => {
    if (!publicClient || !CONTRACT_ADDRESS || !addr) {
      setUser(null);
      setIsUserLoaded(true);
      return;
    }

    setIsUserLoaded(false);

    try {
      // 1. Coba dari localStorage dulu (paling cepat)
      const localUserStr = localStorage.getItem(`donationUser_${addr}`);
      if (localUserStr) {
        setUser(JSON.parse(localUserStr));
      } else {
        // 2. Fallback: ambil dari MongoDB via API (untuk HP / perangkat baru)
        const remoteUser = await getUserProfile(addr);
        if (remoteUser) {
          // Simpan ke localStorage sebagai cache untuk session berikutnya
          localStorage.setItem(`donationUser_${addr}`, JSON.stringify(remoteUser));
          setUser(remoteUser);
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setUser(null);
    } finally {
      setIsUserLoaded(true);
    }
  }, [publicClient]);


  useEffect(() => {
    if (isConnected && address) {
      loadUser(address);
    } else {
      setUser(null);
      setIsUserLoaded(false);
      setIsContractOwner(false);
      setIsVerifiedCreator(false);
    }
  }, [isConnected, address, loadUser]);

  useEffect(() => {
    if (readOnlyContract && address) {
      setIsOwnerLoaded(false);
      readOnlyContract.owner().then((res) => {
        setIsContractOwner(res.toLowerCase() === address.toLowerCase());
      }).catch(console.error).finally(() => {
        setIsOwnerLoaded(true);
      });

      readOnlyContract.verifiedCreators(address).then((res) => {
        setIsVerifiedCreator(res);
      }).catch(console.error);
    } else {
      setIsContractOwner(false);
      setIsVerifiedCreator(false);
      setIsOwnerLoaded(false);
    }
  }, [readOnlyContract, address]);

  const refreshUser = useCallback(async () => {
    if (address) {
      await loadUser(address);
    }
  }, [address, loadUser]);

  const disconnectWallet = useCallback(async () => {
    // 1. Revoke MetaMask permissions langsung di provider level
    //    Ini membersihkan pending eth_requestAccounts internal MetaMask
    //    yang menjadi penyebab stuck saat reconnect
    try {
      const provider = window.ethereum;
      if (provider) {
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
            .catch(() => {});
        }
      }
    } catch (_) { /* ignore */ }

    // 2. Disconnect wagmi connector
    try {
      if (connector && typeof connector.disconnect === 'function') {
        await connector.disconnect().catch(() => {});
      }
    } catch (_) { /* ignore */ }

    disconnect();
    resetConnect();
    setUser(null);
    setIsUserLoaded(false);
    setIsContractOwner(false);
    setIsVerifiedCreator(false);
    setIsOwnerLoaded(false);
    toast.success('Wallet terputus');
  }, [disconnect, resetConnect, connector]);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const value = {
    provider: publicClient,
    signer: walletClient,
    contract,
    readOnlyContract,
    usdcContract,
    readOnlyUsdcContract,
    usdcAddress: USDC_ADDRESS,
    account: address,
    user,
    networkId: publicClient?.chain?.id?.toString() || null,
    isConnecting,
    isCorrectNetwork: publicClient?.chain?.id === parseInt(import.meta.env.VITE_NETWORK_ID || '31337'),
    connectWallet: () => { }, // RainbowKit handles this via ConnectButton
    disconnectWallet,
    refreshUser,
    isConnected,
    isUserLoaded,
    shortAddress,
    isContractOwner,
    isOwnerLoaded,
    isVerifiedCreator,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) throw new Error('useWeb3 harus digunakan di dalam Web3Provider');
  return context;
};


// ==================================================================
// Helper: buat contract wrapper yang mimik ethers.js Contract API
// ==================================================================
function createContractWrapper(publicClient, walletClient, contractAddress, abi) {
  return new Proxy({}, {
    get(target, functionName) {
      const abiEntry = abi.find(
        (entry) => entry.type === 'function' && entry.name === functionName
      );

      if (!abiEntry) return undefined;

      const isView = abiEntry.stateMutability === 'view' || abiEntry.stateMutability === 'pure';

      if (isView) {
        return async (...args) => {
          const result = await publicClient.readContract({
            address: contractAddress,
            abi,
            functionName,
            args,
          });
          return result;
        };
      } else {
        return async (...args) => {
          if (!walletClient) {
            throw new Error('Wallet belum terhubung');
          }

          let callArgs = args;
          let txOverrides = {};

          if (args.length > 0 && typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null) {
            const lastArg = args[args.length - 1];
            if ('value' in lastArg && typeof lastArg.value === 'bigint') {
              txOverrides = lastArg;
              callArgs = args.slice(0, -1);
            }
          }

          const hash = await walletClient.writeContract({
            address: contractAddress,
            abi,
            functionName,
            args: callArgs,
            ...(txOverrides.value ? { value: txOverrides.value } : {}),
          });

          return {
            hash,
            wait: async () => {
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return receipt;
            },
          };
        };
      }
    },
  });
}
