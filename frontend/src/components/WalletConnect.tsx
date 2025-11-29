'use client';

import { useState, useEffect } from 'react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { isMidnightAvailable } from '@/lib/midnight';
import { Wallet, ChevronDown, LogOut, Copy, Check, ExternalLink, AlertCircle, Zap } from 'lucide-react';

interface DetectedWallet {
  name: string;
  icon: string;
  apiVersion: string;
  supportsMidnight?: boolean;
}

export function WalletConnect() {
  const {
    connected,
    address,
    formattedBalance,
    walletName,
    loading,
    error,
    network,
    isInitialized,
    connectWallet,
    disconnectWallet,
  } = useCardanoWallet();

  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [midnightAvailable, setMidnightAvailable] = useState(false);

  // Check Midnight availability
  useEffect(() => {
    isMidnightAvailable().then(setMidnightAvailable);
  }, []);

  // Detect available Cardano wallets
  useEffect(() => {
    const detectWallets = () => {
      const wallets: DetectedWallet[] = [];
      // Wallets that support Midnight integration
      const midnightWallets = ['lace'];

      if (typeof window !== 'undefined' && (window as any).cardano) {
        const cardano = (window as any).cardano;
        const walletNames = ['lace', 'eternl', 'nami', 'flint', 'typhon', 'gerowallet', 'nufi', 'yoroi'];

        for (const name of walletNames) {
          const walletObj = cardano[name];
          if (walletObj && typeof walletObj.enable === 'function') {
            wallets.push({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              icon: walletObj.icon || '',
              apiVersion: walletObj.apiVersion || '1.0.0',
              supportsMidnight: midnightWallets.includes(name),
            });
          }
        }
      }

      setDetectedWallets(wallets);
    };

    const timer = setTimeout(detectWallets, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 20) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  const handleConnect = async (name: string) => {
    setShowDropdown(false);
    await connectWallet(name);
  };

  const getExplorerUrl = (addr: string) => {
    const baseUrls: Record<string, string> = {
      mainnet: 'https://cardanoscan.io',
      preview: 'https://preview.cardanoscan.io',
      preprod: 'https://preprod.cardanoscan.io',
    };
    return `${baseUrls[network] || baseUrls.preview}/address/${addr}`;
  };

  // Loading state during auto-reconnect
  if (!isInitialized || (loading && !connected)) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-5 py-3 bg-brutal-cream border-4 border-brutal-black font-bold uppercase"
      >
        <div className="spinner-brutal w-5 h-5" />
        <span>Reconnecting...</span>
      </button>
    );
  }

  // Connected state UI
  if (connected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-3 bg-accent-green border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
        >
          <div className="w-3 h-3 bg-brutal-black animate-pulse" />
          <div className="text-left">
            <div className="font-bold text-sm">{formattedBalance} ADA</div>
            <div className="text-xs font-mono">{truncateAddress(address)}</div>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-80 bg-brutal-white border-4 border-brutal-black shadow-brutal-lg z-50 animate-brutal-pop">
              {/* Header */}
              <div className="px-4 py-3 border-b-4 border-brutal-black bg-accent-yellow">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-sm">{walletName}</span>
                  <span className="px-2 py-1 bg-brutal-black text-brutal-white font-bold text-xs uppercase">
                    {network}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="p-4 border-b-4 border-brutal-black">
                <div className="font-bold text-xs uppercase tracking-wider mb-2">Address</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-brutal-cream p-2 border-3 border-brutal-black font-mono truncate">
                    {address}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    className="p-2 bg-brutal-white border-3 border-brutal-black hover:bg-accent-yellow transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Balance */}
              <div className="p-4 border-b-4 border-brutal-black bg-accent-green">
                <div className="font-bold text-xs uppercase tracking-wider mb-1">Balance</div>
                <div className="text-3xl font-bold">{formattedBalance} ADA</div>
              </div>

              {/* Midnight Status */}
              <div className={`p-3 border-b-4 border-brutal-black ${midnightAvailable ? 'bg-accent-purple text-white' : 'bg-brutal-cream'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase">Midnight ZK</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-bold uppercase ${
                    midnightAvailable ? 'bg-accent-green text-brutal-black' : 'bg-brutal-black text-brutal-white'
                  }`}>
                    {midnightAvailable ? 'Connected' : 'Demo Mode'}
                  </span>
                </div>
                {walletName?.toLowerCase() === 'lace' && (
                  <p className="text-[10px] mt-1 opacity-80">
                    Full Midnight integration available
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="p-3 space-y-2">
                <a
                  href={getExplorerUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 bg-brutal-white border-3 border-brutal-black hover:bg-accent-blue hover:text-white transition-colors font-bold text-sm"
                >
                  <span className="uppercase">View on Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    disconnectWallet();
                    setShowDropdown(false);
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 bg-accent-pink border-3 border-brutal-black hover:shadow-brutal-sm transition-all font-bold text-sm"
                >
                  <span className="uppercase">Disconnect</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Not connected state UI
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-3 bg-brutal-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="spinner-brutal w-5 h-5" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            <span>Connect</span>
          </>
        )}
      </button>

      {/* Error message */}
      {error && !showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-accent-pink border-4 border-brutal-black shadow-brutal p-4 z-50 animate-brutal-shake">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm uppercase mb-1">Connection Error</div>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {detectedWallets.length > 0 ? (
            <div className="absolute right-0 mt-2 w-80 bg-brutal-white border-4 border-brutal-black shadow-brutal-lg z-50 animate-brutal-pop">
              <div className="px-4 py-3 border-b-4 border-brutal-black bg-accent-yellow">
                <span className="font-bold uppercase tracking-wider">Select Wallet</span>
              </div>
              <div className="p-3 space-y-2">
                {detectedWallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet.name)}
                    disabled={loading}
                    className={`w-full flex items-center gap-3 px-4 py-3 bg-brutal-white border-3 border-brutal-black hover:shadow-brutal-sm transition-all disabled:opacity-50 ${
                      wallet.supportsMidnight ? 'hover:bg-accent-purple hover:text-white' : 'hover:bg-accent-green'
                    }`}
                  >
                    {wallet.icon ? (
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="w-10 h-10 border-2 border-brutal-black"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-brutal-black flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-brutal-white" />
                      </div>
                    )}
                    <div className="text-left flex-1">
                      <div className="font-bold uppercase flex items-center gap-2">
                        {wallet.name}
                        {wallet.supportsMidnight && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent-purple text-white text-[10px] font-bold uppercase">
                            <Zap className="w-3 h-3" />
                            ZK
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {wallet.supportsMidnight ? 'Midnight + Cardano' : `v${wallet.apiVersion}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* Midnight Info */}
              <div className="px-3 pb-3">
                <div className="p-3 bg-accent-purple text-white border-3 border-brutal-black">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase">Midnight ZK Privacy</span>
                  </div>
                  <p className="text-[10px] opacity-90">
                    Lace wallet supports Midnight for enhanced privacy with zero-knowledge proofs.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute right-0 mt-2 w-80 bg-brutal-white border-4 border-brutal-black shadow-brutal-lg z-50 animate-brutal-pop">
              <div className="px-4 py-3 border-b-4 border-brutal-black bg-accent-pink">
                <span className="font-bold uppercase tracking-wider">No Wallets Found</span>
              </div>
              <div className="p-4">
                <div className="w-16 h-16 bg-brutal-black mx-auto mb-4 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-accent-yellow" />
                </div>
                <p className="text-sm text-center mb-4">Install a Cardano wallet extension to continue</p>
                <div className="space-y-2">
                  <a
                    href="https://eternl.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-3 bg-accent-blue text-white border-3 border-brutal-black font-bold text-sm uppercase text-center hover:shadow-brutal-sm transition-all"
                  >
                    Get Eternl
                  </a>
                  <a
                    href="https://www.lace.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-3 bg-accent-purple text-white border-3 border-brutal-black font-bold text-sm uppercase text-center hover:shadow-brutal-sm transition-all"
                  >
                    Get Lace
                  </a>
                  <a
                    href="https://namiwallet.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-3 bg-accent-orange text-brutal-black border-3 border-brutal-black font-bold text-sm uppercase text-center hover:shadow-brutal-sm transition-all"
                  >
                    Get Nami
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
