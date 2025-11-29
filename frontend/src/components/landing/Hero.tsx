'use client';

import Link from 'next/link';
import { ArrowRight, Shield, Sparkles, TrendingUp } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative py-20 px-4 bg-brutal-cream border-b-4 border-brutal-black overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-dots opacity-30" />

      <div className="max-w-6xl mx-auto relative">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-green border-4 border-brutal-black shadow-brutal">
            <span className="w-3 h-3 bg-brutal-black animate-pulse" />
            <span className="font-bold text-sm uppercase tracking-wider">
              Powered by Cardano + Midnight Network
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-center mb-6 leading-tight">
          <span className="heading-brutal">THE NO-LOSS</span>
          <br />
          <span className="relative inline-block">
            LOTTERY
            <div className="absolute -bottom-2 left-0 right-0 h-4 md:h-6 bg-accent-pink -z-10 -skew-x-3" />
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-center max-w-3xl mx-auto mb-10 leading-relaxed">
          Deposit ADA. Earn staking yield. Win prizes.
          <br />
          <strong className="bg-accent-yellow px-2 py-1 inline-block mt-2">
            Everyone gets their money back. Always.
          </strong>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/app"
            className="flex items-center gap-3 px-8 py-4 bg-accent-green border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-1 hover:-translate-y-1 transition-all font-bold text-lg uppercase tracking-wider"
          >
            Launch App
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="#how-it-works"
            className="flex items-center gap-3 px-8 py-4 bg-brutal-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-1 hover:-translate-y-1 transition-all font-bold text-lg uppercase tracking-wider"
          >
            Learn More
          </Link>
        </div>

        {/* Stats Preview */}
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="bg-accent-blue text-white border-4 border-brutal-black shadow-brutal p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold text-sm uppercase">APY</span>
            </div>
            <div className="text-4xl font-bold">~4.5%</div>
            <p className="text-sm opacity-80 mt-1">Cardano Staking Yield</p>
          </div>

          <div className="bg-accent-pink border-4 border-brutal-black shadow-brutal p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5" />
              <span className="font-bold text-sm uppercase">Risk</span>
            </div>
            <div className="text-4xl font-bold">0%</div>
            <p className="text-sm opacity-80 mt-1">No Loss of Principal</p>
          </div>

          <div className="bg-accent-purple text-white border-4 border-brutal-black shadow-brutal p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold text-sm uppercase">Privacy</span>
            </div>
            <div className="text-4xl font-bold">100%</div>
            <p className="text-sm opacity-80 mt-1">ZK Protected</p>
          </div>
        </div>
      </div>
    </section>
  );
}
