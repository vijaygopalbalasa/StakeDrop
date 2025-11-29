'use client';

import Link from 'next/link';
import { ArrowRight, Shield, Trophy, Wallet } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20 px-4 bg-brutal-black text-brutal-white border-t-4 border-brutal-black">
      <div className="max-w-5xl mx-auto text-center">
        {/* Main CTA */}
        <div className="mb-16">
          <h2 className="text-4xl md:text-6xl font-bold uppercase mb-6">
            Ready to <span className="text-accent-yellow">Win</span> Without Risk?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Join the no-loss lottery revolution. Deposit your ADA, keep your principal safe,
            and get a chance to win all the staking rewards.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-3 px-10 py-5 bg-accent-green text-brutal-black border-4 border-brutal-white shadow-brutal hover:shadow-brutal-lg hover:-translate-x-1 hover:-translate-y-1 transition-all font-bold text-xl uppercase tracking-wider"
          >
            Launch App Now
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>

        {/* Quick Start Steps */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border-4 border-gray-800 p-6 relative">
            <div className="absolute -top-4 -left-4 w-10 h-10 bg-accent-yellow text-brutal-black flex items-center justify-center font-bold text-xl">
              1
            </div>
            <div className="w-16 h-16 bg-accent-blue mx-auto mb-4 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold uppercase mb-2">Connect Wallet</h3>
            <p className="text-sm text-gray-400">
              Use Eternl or Lace wallet on Preview testnet
            </p>
          </div>

          <div className="bg-gray-900 border-4 border-gray-800 p-6 relative">
            <div className="absolute -top-4 -left-4 w-10 h-10 bg-accent-yellow text-brutal-black flex items-center justify-center font-bold text-xl">
              2
            </div>
            <div className="w-16 h-16 bg-accent-purple mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold uppercase mb-2">Make Deposit</h3>
            <p className="text-sm text-gray-400">
              Enter amount, download secret file, confirm TX
            </p>
          </div>

          <div className="bg-gray-900 border-4 border-gray-800 p-6 relative">
            <div className="absolute -top-4 -left-4 w-10 h-10 bg-accent-yellow text-brutal-black flex items-center justify-center font-bold text-xl">
              3
            </div>
            <div className="w-16 h-16 bg-accent-green mx-auto mb-4 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-brutal-black" />
            </div>
            <h3 className="font-bold uppercase mb-2">Win or Withdraw</h3>
            <p className="text-sm text-gray-400">
              Check if you won, claim your funds either way
            </p>
          </div>
        </div>

        {/* Testnet Warning */}
        <div className="mt-12 inline-block px-6 py-3 bg-accent-pink text-brutal-black border-4 border-brutal-white">
          <p className="font-bold text-sm uppercase">
            Currently on Cardano Preview Testnet - Use test ADA only!
          </p>
        </div>
      </div>
    </section>
  );
}
