'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      category: 'Basics',
      question: 'What is StakeDrop?',
      answer: 'StakeDrop is a no-loss lottery built on Cardano. You deposit ADA, which gets pooled and staked to earn yield. At the end of each epoch (~5 days), one winner is randomly selected to receive all the yield. Everyone else gets their full deposit back - no one loses their money.',
    },
    {
      category: 'Basics',
      question: 'How can it be "no loss"?',
      answer: 'The prizes come entirely from staking rewards, not from other participants\' deposits. When you deposit ADA, it gets staked on Cardano to earn ~4.5% APY. This yield becomes the prize pool. Your original deposit (principal) is always returned to you, whether you win or lose.',
    },
    {
      category: 'Basics',
      question: 'What are my chances of winning?',
      answer: 'Everyone has an equal chance of winning regardless of how much they deposit. The winner is selected randomly using verifiable zero-knowledge proofs. The more participants in the pool, the larger the prize but the lower individual odds of winning.',
    },
    {
      category: 'Privacy',
      question: 'How does the privacy work?',
      answer: 'StakeDrop uses Midnight Network\'s zero-knowledge proofs. When you deposit, you create a cryptographic "commitment" that hides your deposit amount. Only you know how much you deposited. When withdrawing, you prove ownership using a secret file without revealing any details.',
    },
    {
      category: 'Privacy',
      question: 'What is the secret file?',
      answer: 'When you deposit, you download a secret JSON file. This file contains a cryptographic secret that proves you own your deposit. You MUST save this file securely - if you lose it, you cannot withdraw your funds. Think of it like a private key for your deposit.',
    },
    {
      category: 'Technical',
      question: 'What blockchain does this run on?',
      answer: 'StakeDrop runs on Cardano for staking and fund management, and uses Midnight Network for zero-knowledge privacy features. Smart contracts are written in Aiken (Cardano) and Compact (Midnight).',
    },
    {
      category: 'Technical',
      question: 'Is this audited?',
      answer: 'StakeDrop is currently a hackathon project running on testnet only. It has not been professionally audited. Do not use real funds until a mainnet version has been properly audited and reviewed.',
    },
    {
      category: 'Using the App',
      question: 'What wallet do I need?',
      answer: 'You need a Cardano wallet browser extension. We recommend Eternl or Lace wallet. Make sure you\'re connected to the Preview testnet and have test ADA from the Cardano faucet.',
    },
    {
      category: 'Using the App',
      question: 'What is the minimum deposit?',
      answer: 'The minimum deposit is 10 ADA. There is no maximum limit, but remember that all participants have equal odds of winning regardless of deposit size.',
    },
    {
      category: 'Using the App',
      question: 'When can I withdraw?',
      answer: 'Withdrawals open after each epoch ends and the winner is selected. You can withdraw during the "Distributing" phase. Simply upload your secret file and sign the withdrawal transaction.',
    },
  ];

  const categories = [...new Set(faqs.map((f) => f.category))];

  return (
    <section id="faq" className="py-20 px-4 bg-brutal-white">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-accent-blue text-white border-4 border-brutal-black shadow-brutal mb-6">
            <span className="font-bold uppercase tracking-wider">Got Questions?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            FREQUENTLY <span className="heading-brutal">ASKED</span>
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about StakeDrop
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border-4 border-brutal-black shadow-brutal overflow-hidden ${
                openIndex === index ? 'bg-accent-yellow' : 'bg-brutal-white'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 bg-brutal-black text-brutal-white text-xs font-bold uppercase">
                    {faq.category}
                  </span>
                  <span className="font-bold text-lg">{faq.question}</span>
                </div>
                <ChevronDown
                  className={`w-6 h-6 transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <div className="pt-4 border-t-2 border-brutal-black">
                    <p className="text-gray-800">{faq.answer}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 bg-accent-purple text-white border-4 border-brutal-black shadow-brutal p-8 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold uppercase mb-2">Still Have Questions?</h3>
          <p className="mb-6 opacity-90">
            Check out our GitHub repository or join the community discussion
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/vijaygopalbalasa/StakeDrop"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-brutal-white text-brutal-black border-4 border-brutal-white font-bold uppercase hover:bg-accent-yellow transition-colors"
            >
              View on GitHub
            </a>
            <a
              href="https://docs.midnight.network"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-transparent text-white border-4 border-brutal-white font-bold uppercase hover:bg-white hover:text-brutal-black transition-colors"
            >
              Midnight Docs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
