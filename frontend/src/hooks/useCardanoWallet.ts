'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@meshsdk/react';
import { WalletState } from '@/types';
import { NETWORK, LOVELACE_PER_ADA } from '@/lib/constants';

export function useCardanoWallet() {
  const { connected, wallet, name, connect, disconnect } = useWallet();
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: BigInt(0),
    network: NETWORK as 'preview' | 'preprod' | 'mainnet',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallet details when connected
  useEffect(() => {
    async function fetchWalletDetails() {
      if (!connected || !wallet) {
        setState((prev) => ({
          ...prev,
          connected: false,
          address: null,
          balance: BigInt(0),
        }));
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get wallet address
        const addresses = await wallet.getUsedAddresses();
        const address = addresses[0] || (await wallet.getUnusedAddresses())[0];

        // Get balance
        const balanceAssets = await wallet.getBalance();
        const lovelace = balanceAssets.find((a) => a.unit === 'lovelace');
        const balance = BigInt(lovelace?.quantity || '0');

        // Get network
        const networkId = await wallet.getNetworkId();
        const network = networkId === 1 ? 'mainnet' : 'preview';

        setState({
          connected: true,
          address,
          balance,
          network: network as 'preview' | 'preprod' | 'mainnet',
        });
      } catch (err) {
        console.error('Failed to fetch wallet details:', err);
        setError('Failed to fetch wallet details');
      } finally {
        setLoading(false);
      }
    }

    fetchWalletDetails();
  }, [connected, wallet]);

  // Connect to wallet
  const connectWallet = useCallback(
    async (walletName: string) => {
      try {
        setLoading(true);
        setError(null);
        await connect(walletName);
      } catch (err) {
        console.error('Failed to connect wallet:', err);
        setError('Failed to connect wallet');
      } finally {
        setLoading(false);
      }
    },
    [connect]
  );

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      setState({
        connected: false,
        address: null,
        balance: BigInt(0),
        network: NETWORK as 'preview' | 'preprod' | 'mainnet',
      });
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
    }
  }, [disconnect]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!connected || !wallet) return;

    try {
      const balanceAssets = await wallet.getBalance();
      const lovelace = balanceAssets.find((a) => a.unit === 'lovelace');
      const balance = BigInt(lovelace?.quantity || '0');

      setState((prev) => ({ ...prev, balance }));
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [connected, wallet]);

  // Format balance as ADA
  const formattedBalance = (Number(state.balance) / LOVELACE_PER_ADA).toFixed(2);

  return {
    ...state,
    walletName: name,
    loading,
    error,
    formattedBalance,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    wallet,
  };
}
