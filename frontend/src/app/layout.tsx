import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-midnight-950 text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
