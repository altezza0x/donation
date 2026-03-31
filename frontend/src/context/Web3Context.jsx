import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useDisconnect } from 'wagmi';
import { getContract, formatEther } from 'viem';
import { DONATION_SYSTEM_ABI, CONTRACT_ADDRESS } from '../contracts/DonationSystem';
import toast from 'react-hot-toast';

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
  const { address, isConnected, isConnecting } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const [user, setUser] = useState(null);
  const [contract, setContract] = useState(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);

  // Buat wrapper contract yang kompatibel dengan ethers-style calls
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
      const localUserStr = localStorage.getItem(`donationUser_${addr}`);
      if (localUserStr) {
        setUser(JSON.parse(localUserStr));
      } else {
        setUser(null);
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
    }
  }, [isConnected, address, loadUser]);

  const refreshUser = useCallback(async () => {
    if (address) {
      await loadUser(address);
    }
  }, [address, loadUser]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setUser(null);
    setIsUserLoaded(false);
    toast.success('Wallet terputus');
  }, [disconnect]);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const value = {
    provider: publicClient,
    signer: walletClient,
    contract,
    account: address,
    user,
    networkId: publicClient?.chain?.id?.toString() || null,
    isConnecting,
    isCorrectNetwork: publicClient?.chain?.id === 31337,
    connectWallet: () => { }, // RainbowKit handles this via ConnectButton
    disconnectWallet,
    refreshUser,
    isConnected,
    isUserLoaded,
    shortAddress,
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
