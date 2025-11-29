'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { NETWORK } from '@/lib/constants';

// Storage key for persisting wallet connection
const WALLET_STORAGE_KEY = 'stakedrop_connected_wallet';

interface WalletState {
  connected: boolean;
  address: string | null;
  balance: bigint;
  network: 'preview' | 'preprod' | 'mainnet';
}

interface WalletApi {
  getUsedAddresses: () => Promise<string[]>;
  getUnusedAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string>;
  getBalance: () => Promise<string>;
  getNetworkId: () => Promise<number>;
  signTx: (tx: string, partialSign?: boolean) => Promise<string>;
  submitTx: (tx: string) => Promise<string>;
}

// Lovelace per ADA
const LOVELACE = 1_000_000;

export function useCardanoWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    balance: BigInt(0),
    network: NETWORK as 'preview' | 'preprod' | 'mainnet',
  });
  const [walletName, setWalletName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletApi, setWalletApi] = useState<WalletApi | null>(null);
  const [BrowserWallet, setBrowserWallet] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const reconnectAttempted = useRef(false);

  // Load MeshJS BrowserWallet on client side
  useEffect(() => {
    import('@meshsdk/core')
      .then((mod) => {
        setBrowserWallet(() => mod.BrowserWallet);
      })
      .catch((err) => {
        console.error('Failed to load MeshJS:', err);
      });
  }, []);

  // Helper to save wallet connection to localStorage
  const saveWalletConnection = useCallback((name: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WALLET_STORAGE_KEY, name);
    }
  }, []);

  // Helper to clear wallet connection from localStorage
  const clearWalletConnection = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WALLET_STORAGE_KEY);
    }
  }, []);

  // Helper to get saved wallet name from localStorage
  const getSavedWalletName = useCallback((): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(WALLET_STORAGE_KEY);
    }
    return null;
  }, []);

  // Connect to wallet using MeshJS BrowserWallet
  const connectWallet = useCallback(async (name: string, isReconnect: boolean = false) => {
    try {
      setLoading(true);
      if (!isReconnect) {
        setError(null);
      }

      if (!BrowserWallet) {
        throw new Error('MeshJS not loaded yet. Please try again.');
      }

      // Check if wallet extension is available
      if (typeof window !== 'undefined') {
        const cardano = (window as any).cardano;
        if (!cardano || !cardano[name.toLowerCase()]) {
          throw new Error(`${name} wallet extension not found. Please install it.`);
        }
      }

      // Use MeshJS BrowserWallet which handles CBOR decoding automatically
      const wallet = await BrowserWallet.enable(name.toLowerCase());

      if (!wallet) {
        throw new Error(`Failed to enable ${name} wallet`);
      }

      // Get the change address (properly decoded to bech32)
      const changeAddress = await wallet.getChangeAddress();

      // If no change address, try used addresses
      let address = changeAddress;
      if (!address) {
        const usedAddresses = await wallet.getUsedAddresses();
        address = usedAddresses[0];
      }
      if (!address) {
        const unusedAddresses = await wallet.getUnusedAddresses();
        address = unusedAddresses[0];
      }

      if (!address) {
        throw new Error('No addresses found in wallet');
      }

      // Get balance - MeshJS returns array of assets with lovelace
      const balanceAssets = await wallet.getBalance();
      let lovelaceBalance = BigInt(0);

      // Balance can be array of assets or single value
      if (Array.isArray(balanceAssets)) {
        // Find lovelace (ADA) in the assets
        const lovelaceAsset = balanceAssets.find(
          (asset: any) => asset.unit === 'lovelace' || asset.unit === ''
        );
        if (lovelaceAsset) {
          lovelaceBalance = BigInt(lovelaceAsset.quantity);
        }
      } else if (typeof balanceAssets === 'string') {
        lovelaceBalance = BigInt(balanceAssets);
      }

      // Get network ID
      const networkId = await wallet.getNetworkId();
      const network = networkId === 1 ? 'mainnet' : networkId === 0 ? 'preview' : 'preprod';

      setState({
        connected: true,
        address,
        balance: lovelaceBalance,
        network: network as 'preview' | 'preprod' | 'mainnet',
      });
      setWalletName(name);
      setWalletApi(wallet);

      // Save to localStorage for session persistence
      saveWalletConnection(name);

      console.log('Wallet connected:', {
        name,
        address,
        balance: lovelaceBalance.toString(),
        network,
        isReconnect,
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to connect wallet:', err);

      // Only show error and clear storage if it's a manual connect attempt
      if (!isReconnect) {
        setError(errorMsg);
      } else {
        // If reconnect fails, clear the saved wallet
        clearWalletConnection();
      }

      // Reset state on error
      setState({
        connected: false,
        address: null,
        balance: BigInt(0),
        network: NETWORK as 'preview' | 'preprod' | 'mainnet',
      });
    } finally {
      setLoading(false);
    }
  }, [BrowserWallet, saveWalletConnection, clearWalletConnection]);

  // Auto-reconnect on page load if wallet was previously connected
  useEffect(() => {
    if (BrowserWallet && !reconnectAttempted.current && !state.connected) {
      reconnectAttempted.current = true;

      const savedWallet = getSavedWalletName();
      if (savedWallet) {
        console.log('Attempting to reconnect to saved wallet:', savedWallet);
        // Small delay to ensure wallet extension is ready
        setTimeout(() => {
          connectWallet(savedWallet, true);
        }, 500);
      }
      setIsInitialized(true);
    } else if (BrowserWallet && !isInitialized) {
      setIsInitialized(true);
    }
  }, [BrowserWallet, state.connected, connectWallet, getSavedWalletName, isInitialized]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setState({
      connected: false,
      address: null,
      balance: BigInt(0),
      network: NETWORK as 'preview' | 'preprod' | 'mainnet',
    });
    setWalletName(null);
    setWalletApi(null);
    setError(null);

    // Clear from localStorage
    clearWalletConnection();

    console.log('Wallet disconnected');
  }, [clearWalletConnection]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!walletApi) return;

    try {
      const balanceAssets = await walletApi.getBalance();
      let lovelaceBalance = BigInt(0);

      if (Array.isArray(balanceAssets)) {
        const lovelaceAsset = (balanceAssets as any[]).find(
          (asset: any) => asset.unit === 'lovelace' || asset.unit === ''
        );
        if (lovelaceAsset) {
          lovelaceBalance = BigInt(lovelaceAsset.quantity);
        }
      } else if (typeof balanceAssets === 'string') {
        lovelaceBalance = BigInt(balanceAssets);
      }

      setState((prev) => ({ ...prev, balance: lovelaceBalance }));
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [walletApi]);

  // Format balance as ADA with 2 decimal places
  const formattedBalance = (Number(state.balance) / LOVELACE).toFixed(2);

  return {
    ...state,
    walletName,
    loading,
    error,
    formattedBalance,
    isInitialized,
    connectWallet: (name: string) => connectWallet(name, false),
    disconnectWallet,
    refreshBalance,
    wallet: walletApi,
  };
}
