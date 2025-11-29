'use client';

import { useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { PoolStats } from '@/components/PoolStats';
import { DepositForm } from '@/components/DepositForm';
import { WithdrawForm } from '@/components/WithdrawForm';
import { EpochTimer } from '@/components/EpochTimer';
import { Shield, Coins, Trophy, ArrowRight, Github, ExternalLink } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  return (
    <div className="min-h-screen grid-pattern">
      {/* Header */}
      <header className="border-b border-midnight-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cardano-500 to-midnight-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">StakeDrop</h1>
              <p className="text-xs text-gray-500">No-Loss Lottery</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/vijaygopalbalasa/StakeDrop"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-midnight-800 rounded-lg transition-colors"
            >
              <Github className="w-5 h-5 text-gray-400" />
            </a>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-midnight-800/50 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-400">Powered by Cardano + Midnight</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Privacy-First</span>
            <br />
            No-Loss Lottery
          </h2>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Deposit stablecoins, earn staking yield, win prizes.
            Your identity stays private with Midnight&apos;s ZK proofs.
            <strong className="text-white"> Everyone gets their money back.</strong>
          </p>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
              <div className="w-12 h-12 rounded-lg bg-cardano-500/20 flex items-center justify-center mb-4 mx-auto">
                <Coins className="w-6 h-6 text-cardano-400" />
              </div>
              <h3 className="font-bold mb-2">1. Deposit Privately</h3>
              <p className="text-sm text-gray-500">
                Your deposit amount is hidden using ZK commitments on Midnight
              </p>
            </div>

            <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
              <div className="w-12 h-12 rounded-lg bg-midnight-500/20 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-midnight-400" />
              </div>
              <h3 className="font-bold mb-2">2. Pool Stakes on Cardano</h3>
              <p className="text-sm text-gray-500">
                Funds are delegated to stake pools, earning real ADA yield
              </p>
            </div>

            <div className="bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4 mx-auto">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="font-bold mb-2">3. Winner Takes Yield</h3>
              <p className="text-sm text-gray-500">
                One lucky winner gets all yield. Everyone else gets principal back.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main App */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Pool Stats */}
          <div className="mb-8">
            <PoolStats />
          </div>

          {/* Timer + Actions */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Timer */}
            <div className="lg:col-span-1">
              <EpochTimer />

              {/* Tech Stack */}
              <div className="mt-6 bg-midnight-900/50 rounded-xl p-6 border border-midnight-800">
                <h3 className="font-medium mb-4">Built With</h3>
                <div className="space-y-3">
                  <a
                    href="https://midnight.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-midnight-800/50 rounded-lg hover:bg-midnight-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-midnight-500/30 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-midnight-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Midnight</div>
                        <div className="text-xs text-gray-500">ZK Privacy Layer</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>

                  <a
                    href="https://cardano.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-midnight-800/50 rounded-lg hover:bg-midnight-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cardano-500/30 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-cardano-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Cardano</div>
                        <div className="text-xs text-gray-500">Staking & Settlement</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                </div>
              </div>
            </div>

            {/* Deposit/Withdraw Tabs */}
            <div className="lg:col-span-2">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'deposit'
                      ? 'bg-cardano-600 text-white'
                      : 'bg-midnight-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'withdraw'
                      ? 'bg-cardano-600 text-white'
                      : 'bg-midnight-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Withdraw
                </button>
              </div>

              {activeTab === 'deposit' ? <DepositForm /> : <WithdrawForm />}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-midnight-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Built for Cardano Hackathon powered by Hack2Skills</span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <a
                href="https://midnight.network/developer-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
              >
                Midnight Docs
              </a>
              <a
                href="https://developers.cardano.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
              >
                Cardano Docs
              </a>
              <a
                href="https://github.com/vijaygopalbalasa/StakeDrop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
