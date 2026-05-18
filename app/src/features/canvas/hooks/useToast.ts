import { useState, useEffect, useRef, useCallback } from 'react';

const toastListeners = new Set<(text: string) => void>();

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener = (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(text);
      timer.current = setTimeout(() => setMsg(null), 2500);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const show = useCallback((text: string) => {
    toastListeners.forEach((listener) => listener(text));
  }, []);

  return { msg, show };
}
