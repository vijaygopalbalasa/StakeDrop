'use client';

import { useState } from 'react';
import { useWalletList } from '@meshsdk/react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { Wallet, ChevronDown, LogOut, Copy, Check, ExternalLink } from 'lucide-react';

export function WalletConnect() {
  const wallets = useWalletList();
  const {
    connected,
    address,
    formattedBalance,
    walletName,
    loading,
    connectWallet,
    disconnectWallet,
  } = useCardanoWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  if (connected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-midnight-800 hover:bg-midnight-700 rounded-lg transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">{formattedBalance} ADA</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-300">{truncateAddress(address)}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-midnight-800 rounded-lg shadow-xl border border-midnight-700 overflow-hidden z-50">
            <div className="p-4 border-b border-midnight-700">
              <div className="text-sm text-gray-400 mb-1">Connected with {walletName}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{truncateAddress(address)}</span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1 hover:bg-midnight-600 rounded"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-2">
              <a
                href={`https://preview.cardanoscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-midnight-700 rounded-lg"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </a>
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-midnight-700 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-cardano-600 hover:bg-cardano-500 rounded-lg transition-colors disabled:opacity-50"
      >
        <Wallet className="w-5 h-5" />
        <span>{loading ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>

      {showDropdown && wallets.length > 0 && (
        <div className="absolute right-0 mt-2 w-64 bg-midnight-800 rounded-lg shadow-xl border border-midnight-700 overflow-hidden z-50">
          <div className="p-3 border-b border-midnight-700">
            <div className="text-sm text-gray-400">Select a wallet</div>
          </div>
          <div className="p-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => {
                  connectWallet(wallet.name);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-midnight-700 rounded-lg transition-colors"
              >
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  className="w-6 h-6 rounded"
                />
                <span className="font-medium">{wallet.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showDropdown && wallets.length === 0 && (
        <div className="absolute right-0 mt-2 w-64 bg-midnight-800 rounded-lg shadow-xl border border-midnight-700 p-4 z-50">
          <p className="text-sm text-gray-400 mb-3">No wallets detected</p>
          <a
            href="https://eternl.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cardano-400 hover:text-cardano-300"
          >
            Install Eternl Wallet →
          </a>
        </div>
      )}
    </div>
  );
}
