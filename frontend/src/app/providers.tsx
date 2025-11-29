'use client';

import { ReactNode, useState, useEffect } from 'react';

// Simple client-side only provider that avoids SSR issues with MeshJS
export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [MeshProviderComponent, setMeshProviderComponent] = useState<React.ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamically import MeshProvider only on client-side
    import('@meshsdk/react')
      .then((mod) => {
        setMeshProviderComponent(() => mod.MeshProvider);
      })
      .catch((err) => {
        console.error('Failed to load MeshProvider:', err);
      });
  }, []);

  // During SSR or before MeshProvider loads, just render children
  if (!mounted || !MeshProviderComponent) {
    return <>{children}</>;
  }

  return <MeshProviderComponent>{children}</MeshProviderComponent>;
}
