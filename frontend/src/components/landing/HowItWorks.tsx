'use client';

import { Lock, Coins, Trophy, Gift, ArrowDown, Users, Clock, Shield } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'DEPOSIT PRIVATELY',
      description: 'Connect your Cardano wallet and deposit ADA. Your deposit amount stays private using zero-knowledge cryptography.',
      icon: Lock,
      color: 'bg-accent-yellow',
      details: [
        'Generate a secret commitment locally',
        'Your deposit amount is hidden',
        'Download your secret file for withdrawal',
      ],
    },
    {
      number: 2,
      title: 'POOL ACCUMULATES',
      description: 'All deposits are pooled together. More participants means bigger prizes for winners.',
      icon: Users,
      color: 'bg-accent-blue text-white',
      details: [
        'Join other participants in the pool',
        'Pool size determines prize amount',
        'Fair entry regardless of deposit size',
      ],
    },
    {
      number: 3,
      title: 'STAKE & EARN',
      description: 'The pooled funds are delegated to Cardano stake pools, generating real yield through proof-of-stake.',
      icon: Coins,
      color: 'bg-accent-green',
      details: [
        'Funds staked on Cardano blockchain',
        'Earning ~4.5% APY from staking',
        'Epoch duration: ~5 days',
      ],
    },
    {
      number: 4,
      title: 'WINNER SELECTED',
      description: 'At epoch end, one winner is randomly selected using verifiable ZK proofs. The selection is fair and transparent.',
      icon: Trophy,
      color: 'bg-accent-purple text-white',
      details: [
        'Verifiable random selection',
        'ZK proof ensures fairness',
        'Winner identity stays private until claim',
      ],
    },
    {
      number: 5,
      title: 'CLAIM REWARDS',
      description: 'Winner claims their principal plus ALL the yield. Everyone else gets their full principal back - no loss!',
      icon: Gift,
      color: 'bg-accent-pink',
      details: [
        'Winner: Principal + All Yield',
        'Others: Full Principal Back',
        'Upload secret file to claim',
      ],
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-brutal-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-accent-yellow border-4 border-brutal-black shadow-brutal mb-6">
            <span className="font-bold uppercase tracking-wider">Step by Step</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            HOW IT <span className="heading-brutal">WORKS</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A simple process that turns your ADA into lottery tickets without any risk
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full h-8 w-1 bg-brutal-black" />
              )}

              <div className={`grid md:grid-cols-2 gap-6 ${index % 2 === 1 ? 'md:direction-rtl' : ''}`}>
                {/* Content Card */}
                <div className={`${step.color} border-4 border-brutal-black shadow-brutal p-6 ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-brutal-black text-brutal-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold uppercase mb-2">{step.title}</h3>
                      <p className="mb-4">{step.description}</p>
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-brutal-black flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Icon Card */}
                <div className={`bg-brutal-cream border-4 border-brutal-black shadow-brutal p-8 flex items-center justify-center ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div className="w-32 h-32 bg-brutal-black flex items-center justify-center">
                    <step.icon className="w-16 h-16 text-accent-yellow" />
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              {index < steps.length - 1 && (
                <div className="flex justify-center my-4 md:hidden">
                  <ArrowDown className="w-8 h-8" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Box */}
        <div className="mt-16 bg-accent-green border-4 border-brutal-black shadow-brutal-lg p-8">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-16 h-16 bg-brutal-black mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-8 h-8 text-accent-green" />
              </div>
              <h4 className="font-bold text-xl uppercase mb-2">No Risk</h4>
              <p className="text-sm">Your principal is always safe. You can never lose your deposit.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-brutal-black mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-accent-green" />
              </div>
              <h4 className="font-bold text-xl uppercase mb-2">~5 Day Epochs</h4>
              <p className="text-sm">Each lottery round follows Cardano&apos;s epoch schedule.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-brutal-black mx-auto mb-4 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-accent-green" />
              </div>
              <h4 className="font-bold text-xl uppercase mb-2">Real Prizes</h4>
              <p className="text-sm">Winner takes all yield generated from the entire pool.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
