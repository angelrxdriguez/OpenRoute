import { useEffect, useState } from 'react';

import { now } from '@/lib/clock';

/** Hora actual (la del simulador en el navegador), refrescada cada `intervalMs`. */
export function useNow(intervalMs: number): number {
  const [current, setCurrent] = useState(now);

  useEffect(() => {
    const id = setInterval(() => setCurrent(now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return current;
}
