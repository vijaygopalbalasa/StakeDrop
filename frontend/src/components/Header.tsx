'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Github, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { WalletConnect } from './WalletConnect';

export function Header() {
  const pathname = usePathname();
  const isAppPage = pathname === '/app';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b-4 border-brutal-black bg-accent-yellow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-brutal-black flex items-center justify-center border-4 border-brutal-black shadow-brutal-sm group-hover:shadow-brutal transition-all">
              <Shield className="w-7 h-7 text-accent-yellow" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">STAKEDROP</h1>
              <p className="text-xs font-bold uppercase tracking-wider">No-Loss Lottery</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`font-bold uppercase tracking-wider text-sm hover:text-accent-purple transition-colors ${
                pathname === '/' ? 'border-b-3 border-brutal-black' : ''
              }`}
            >
              Home
            </Link>
            <Link
              href="/#how-it-works"
              className="font-bold uppercase tracking-wider text-sm hover:text-accent-purple transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/#features"
              className="font-bold uppercase tracking-wider text-sm hover:text-accent-purple transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#faq"
              className="font-bold uppercase tracking-wider text-sm hover:text-accent-purple transition-colors"
            >
              FAQ
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/vijaygopalbalasa/StakeDrop"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-3 bg-brutal-white border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <Github className="w-5 h-5" />
            </a>

            {isAppPage ? (
              <WalletConnect />
            ) : (
              <Link
                href="/app"
                className="hidden sm:flex items-center gap-2 px-6 py-3 bg-accent-green border-4 border-brutal-black shadow-brutal hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-bold uppercase tracking-wider"
              >
                Launch App
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 bg-brutal-white border-4 border-brutal-black shadow-brutal"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t-4 border-brutal-black">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-brutal-white border-3 border-brutal-black font-bold uppercase text-center"
              >
                Home
              </Link>
              <Link
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-brutal-white border-3 border-brutal-black font-bold uppercase text-center"
              >
                How It Works
              </Link>
              <Link
                href="/#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-brutal-white border-3 border-brutal-black font-bold uppercase text-center"
              >
                Features
              </Link>
              <Link
                href="/#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-brutal-white border-3 border-brutal-black font-bold uppercase text-center"
              >
                FAQ
              </Link>
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-accent-green border-3 border-brutal-black font-bold uppercase text-center"
              >
                Launch App
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
