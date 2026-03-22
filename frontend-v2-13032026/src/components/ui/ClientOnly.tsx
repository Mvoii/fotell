"use client";

import { useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  // This will only run on the client after hydration
  if (typeof window !== 'undefined' && !isClient) {
    setIsClient(true);
  }

  return isClient ? <>{children}</> : <>{fallback}</>;
}
