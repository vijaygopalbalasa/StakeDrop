'use client';

import {
  Shield,
  Eye,
  Lock,
  Zap,
  RefreshCw,
  Wallet,
  FileCheck,
  Globe,
  Award
} from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: Shield,
      title: 'Zero Loss Guarantee',
      description: 'Your principal is always protected. Whether you win or lose, you get your deposit back.',
      color: 'bg-accent-green',
    },
    {
      icon: Eye,
      title: 'Complete Privacy',
      description: 'Deposit amounts and identities are hidden using Midnight Network\'s zero-knowledge proofs.',
      color: 'bg-accent-purple text-white',
    },
    {
      icon: Lock,
      title: 'Self-Custody',
      description: 'Only you can access your funds with your secret file. No third parties, no custodians.',
      color: 'bg-accent-yellow',
    },
    {
      icon: Zap,
      title: 'Real Staking Yield',
      description: 'Prizes come from actual Cardano staking rewards, not from other participants\' deposits.',
      color: 'bg-accent-blue text-white',
    },
    {
      icon: RefreshCw,
      title: 'Recurring Epochs',
      description: 'New lottery rounds every ~5 days following Cardano\'s epoch schedule.',
      color: 'bg-accent-pink',
    },
    {
      icon: FileCheck,
      title: 'Verifiable Fairness',
      description: 'Winner selection is provably random and verifiable through ZK proofs on-chain.',
      color: 'bg-accent-orange',
    },
  ];

  const techStack = [
    {
      name: 'Cardano',
      description: 'Proof-of-stake blockchain for staking and settlement',
      icon: Globe,
    },
    {
      name: 'Midnight Network',
      description: 'ZK privacy layer for confidential transactions',
      icon: Shield,
    },
    {
      name: 'Aiken',
      description: 'Smart contract language for Cardano validators',
      icon: FileCheck,
    },
    {
      name: 'MeshJS',
      description: 'TypeScript SDK for wallet integration',
      icon: Wallet,
    },
  ];

  return (
    <section id="features" className="py-20 px-4 bg-brutal-cream border-y-4 border-brutal-black">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-accent-pink border-4 border-brutal-black shadow-brutal mb-6">
            <span className="font-bold uppercase tracking-wider">Why StakeDrop</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            BUILT FOR <span className="heading-brutal">EVERYONE</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A lottery that protects your money while giving you a chance to win
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`${feature.color} border-4 border-brutal-black shadow-brutal p-6 hover-lift`}
            >
              <div className="w-14 h-14 bg-brutal-black flex items-center justify-center mb-4">
                <feature.icon className={`w-7 h-7 ${feature.color.includes('text-white') ? 'text-white' : 'text-accent-yellow'}`} />
              </div>
              <h3 className="text-xl font-bold uppercase mb-2">{feature.title}</h3>
              <p className="text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Privacy Section */}
        <div className="bg-brutal-black text-brutal-white border-4 border-brutal-black p-8 mb-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-block px-3 py-1 bg-accent-purple text-white text-sm font-bold uppercase mb-4">
                Privacy First
              </div>
              <h3 className="text-3xl font-bold uppercase mb-4">
                YOUR IDENTITY STAYS <span className="text-accent-yellow">HIDDEN</span>
              </h3>
              <p className="text-gray-300 mb-6">
                Unlike traditional lotteries where everyone can see who won, StakeDrop uses
                zero-knowledge proofs to keep your participation and winnings private.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent-green flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span>Deposit amounts are encrypted on-chain</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent-green flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span>No one knows how much you deposited</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent-green flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span>Winner identity revealed only when they claim</span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-64 h-64 bg-accent-purple flex items-center justify-center border-4 border-brutal-white">
                  <Shield className="w-32 h-32 text-brutal-white" />
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-accent-yellow border-4 border-brutal-white flex items-center justify-center">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-accent-green border-4 border-brutal-white flex items-center justify-center">
                  <Eye className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <h3 className="text-2xl font-bold uppercase text-center mb-8">Powered By</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="bg-brutal-white border-4 border-brutal-black shadow-brutal p-4 text-center hover-lift"
              >
                <div className="w-12 h-12 bg-brutal-black mx-auto mb-3 flex items-center justify-center">
                  <tech.icon className="w-6 h-6 text-accent-yellow" />
                </div>
                <h4 className="font-bold uppercase mb-1">{tech.name}</h4>
                <p className="text-xs text-gray-600">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
