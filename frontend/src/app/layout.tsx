import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'StakeDrop - No-Loss Lottery on Cardano + Midnight',
  description:
    'Privacy-preserving no-loss lottery powered by Cardano staking and Midnight ZK proofs. Deposit, earn yield, win prizes - no loss guaranteed.',
  keywords: ['Cardano', 'Midnight', 'ZK', 'No-Loss', 'Lottery', 'DeFi', 'Staking'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-brutal-white text-brutal-black antialiased font-display">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
