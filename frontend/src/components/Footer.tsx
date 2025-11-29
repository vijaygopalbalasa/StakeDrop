'use client';

import Link from 'next/link';
import { Shield, Github, ExternalLink, Twitter, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t-4 border-brutal-black bg-brutal-black text-brutal-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent-yellow flex items-center justify-center">
                <Shield className="w-6 h-6 text-brutal-black" />
              </div>
              <div>
                <h3 className="font-bold text-lg">STAKEDROP</h3>
                <p className="text-xs text-gray-400">No-Loss Lottery</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Privacy-preserving no-loss lottery powered by Cardano staking and Midnight ZK proofs.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/vijaygopalbalasa/StakeDrop"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-accent-purple transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-accent-blue transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 hover:bg-accent-purple transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4 text-accent-yellow">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/app" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Launch App
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-gray-400 hover:text-white transition-colors text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-gray-400 hover:text-white transition-colors text-sm">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Technology */}
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4 text-accent-green">Technology</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://cardano.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  Cardano <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://midnight.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  Midnight Network <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://aiken-lang.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  Aiken <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://meshjs.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  MeshJS <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4 text-accent-pink">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://docs.midnight.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  Midnight Docs <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://developers.cardano.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  Cardano Docs <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/vijaygopalbalasa/StakeDrop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  GitHub Repo <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Built for Cardano Hackathon powered by Hack2Skills
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-600 px-3 py-1 bg-gray-900 border border-gray-800">
                TESTNET ONLY
              </span>
              <span className="text-xs text-gray-500">
                &copy; {new Date().getFullYear()} StakeDrop
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
