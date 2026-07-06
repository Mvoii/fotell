"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Renders children directly into document.body via a React portal, escaping
 * any nested CSS stacking contexts so modals always appear above fixed navbars
 * and other layout chrome.
 */
export function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    elRef.current = document.createElement('div');
  }

  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);
    setMounted(true);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  if (!mounted) return null;
  return createPortal(children, elRef.current!);
}
