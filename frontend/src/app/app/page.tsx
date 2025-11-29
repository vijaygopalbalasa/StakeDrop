'use client';

import { useState } from 'react';
import { PoolStats } from '@/components/PoolStats';
import { DepositForm } from '@/components/DepositForm';
import { WithdrawForm } from '@/components/WithdrawForm';
import { EpochTimer } from '@/components/EpochTimer';
import { Coins, Gift, Shield, Zap, ExternalLink, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function AppPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  return (
    <div className="min-h-screen bg-brutal-white pattern-dots">
      {/* App Header Banner */}
      <div className="bg-accent-purple text-white border-b-4 border-brutal-black py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-bold text-sm uppercase tracking-wider">
              Preview Testnet - Use test ADA only
            </span>
          </div>
          <a
            href="https://faucet.preview.world.dev.cardano.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-bold hover:text-accent-yellow transition-colors"
          >
            Get Test ADA <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Pool Stats */}
          <div className="mb-8">
            <PoolStats />
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Timer & Info */}
            <div className="lg:col-span-1 space-y-6">
              <EpochTimer />

              {/* Quick Links */}
              <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal p-6">
                <h3 className="font-bold text-lg mb-4 uppercase tracking-wider">Quick Links</h3>
                <div className="space-y-3">
                  <a
                    href="https://midnight.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-accent-purple text-white border-3 border-brutal-black hover:shadow-brutal-sm transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brutal-white flex items-center justify-center">
                        <Shield className="w-5 h-5 text-accent-purple" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">MIDNIGHT</div>
                        <div className="text-xs opacity-80">ZK Privacy Layer</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>

                  <a
                    href="https://cardano.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-cardano-primary text-white border-3 border-brutal-black hover:shadow-brutal-sm transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brutal-white flex items-center justify-center">
                        <Coins className="w-5 h-5 text-cardano-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">CARDANO</div>
                        <div className="text-xs opacity-80">Staking & Settlement</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>

              {/* Help Box */}
              <div className="bg-accent-yellow border-4 border-brutal-black shadow-brutal p-6">
                <div className="flex items-center gap-3 mb-3">
                  <HelpCircle className="w-6 h-6" />
                  <h3 className="font-bold uppercase">Need Help?</h3>
                </div>
                <p className="text-sm mb-4">
                  First time using StakeDrop? Learn how everything works.
                </p>
                <Link
                  href="/#how-it-works"
                  className="inline-block px-4 py-2 bg-brutal-black text-brutal-white font-bold text-sm uppercase hover:bg-accent-purple transition-colors"
                >
                  View Guide
                </Link>
              </div>

              {/* ZK Info */}
              <div className="bg-accent-pink border-4 border-brutal-black shadow-brutal p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-6 h-6" />
                  <h3 className="font-bold uppercase">Zero Knowledge</h3>
                </div>
                <p className="text-sm">
                  Your deposit amount and identity stay private. Sign with your wallet to prove ownership - no files needed.
                </p>
              </div>
            </div>

            {/* Right Column - Deposit/Withdraw */}
            <div className="lg:col-span-2">
              {/* Tab Buttons */}
              <div className="flex gap-0 mb-6">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 py-4 font-bold text-lg uppercase tracking-wider border-4 border-brutal-black transition-all ${
                    activeTab === 'deposit'
                      ? 'bg-accent-yellow shadow-none translate-x-1 translate-y-1'
                      : 'bg-brutal-white shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="w-5 h-5" />
                    Deposit
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 py-4 font-bold text-lg uppercase tracking-wider border-4 border-l-0 border-brutal-black transition-all ${
                    activeTab === 'withdraw'
                      ? 'bg-accent-green shadow-none translate-x-1 translate-y-1'
                      : 'bg-brutal-white shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Gift className="w-5 h-5" />
                    Withdraw
                  </div>
                </button>
              </div>

              {/* Form Container */}
              <div className="animate-brutal-pop">
                {activeTab === 'deposit' ? <DepositForm /> : <WithdrawForm />}
              </div>

              {/* Important Notice */}
              <div className="mt-6 bg-brutal-cream border-4 border-brutal-black p-4">
                <h4 className="font-bold uppercase text-sm mb-2">Important Reminders</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-brutal-black mt-1.5 flex-shrink-0" />
                    Your wallet is your key - use the same wallet to withdraw
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-brutal-black mt-1.5 flex-shrink-0" />
                    Minimum deposit is 10 ADA
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-brutal-black mt-1.5 flex-shrink-0" />
                    Withdrawals open after winner selection
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
