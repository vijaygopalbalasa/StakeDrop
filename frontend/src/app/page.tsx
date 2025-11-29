import { Hero, HowItWorks, Features, FAQ, CTA } from '@/components/landing';

export default function Home() {
  return (
    <div className="min-h-screen bg-brutal-white">
      <Hero />
      <HowItWorks />
      <Features />
      <FAQ />
      <CTA />
    </div>
  );
}
