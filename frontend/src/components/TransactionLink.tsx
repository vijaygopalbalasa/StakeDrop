'use client';

import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { getTxExplorerUrl, getAddressExplorerUrl } from '@/lib/blockchain';

interface TransactionLinkProps {
  txHash: string;
  network?: 'mainnet' | 'preview' | 'preprod';
  showFull?: boolean;
  className?: string;
}

export function TransactionLink({
  txHash,
  showFull = false,
  className = '',
}: TransactionLinkProps) {
  const [copied, setCopied] = useState(false);

  const displayHash = showFull
    ? txHash
    : `${txHash.slice(0, 8)}...${txHash.slice(-8)}`;

  const explorerUrl = getTxExplorerUrl(txHash);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-accent-blue transition-colors"
      >
        <span>{displayHash}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-brutal-cream rounded transition-colors"
        title="Copy transaction hash"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-accent-green" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
    </div>
  );
}

interface AddressLinkProps {
  address: string;
  label?: string;
  showFull?: boolean;
  className?: string;
}

export function AddressLink({
  address,
  label,
  showFull = false,
  className = '',
}: AddressLinkProps) {
  const [copied, setCopied] = useState(false);

  const displayAddress = showFull
    ? address
    : `${address.slice(0, 12)}...${address.slice(-8)}`;

  const explorerUrl = getAddressExplorerUrl(address);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && <span className="text-gray-600 text-sm">{label}:</span>}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-mono text-sm hover:text-accent-blue transition-colors"
      >
        <span>{displayAddress}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-brutal-cream rounded transition-colors"
        title="Copy address"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-accent-green" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
    </div>
  );
}

interface TransactionStatusProps {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  className?: string;
}

export function TransactionStatus({
  txHash,
  status,
  className = '',
}: TransactionStatusProps) {
  const statusConfig = {
    pending: {
      color: 'bg-accent-yellow',
      text: 'Pending',
    },
    confirmed: {
      color: 'bg-accent-green',
      text: 'Confirmed',
    },
    failed: {
      color: 'bg-accent-pink',
      text: 'Failed',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`px-2 py-1 ${config.color} border-2 border-brutal-black text-xs font-bold uppercase`}>
        {config.text}
      </div>
      <TransactionLink txHash={txHash} />
    </div>
  );
}
