'use client';

import { useCallback, useRef, useState } from 'react';

/** Content width of an element, kept up to date with a ResizeObserver. `null` until measured.
 *  Returns a callback ref, so it also works for elements that mount after the first render. */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  return [ref, width] as const;
}
