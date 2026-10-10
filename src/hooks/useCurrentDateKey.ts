import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { DateKey } from '../types';
import { toLocalDateKey } from '../utils';

/** Keeps calendar screens aligned with the device's current local day. */
export function useCurrentDateKey(): DateKey {
  const [dateKey, setDateKey] = useState<DateKey>(() => toLocalDateKey());

  useEffect(() => {
    const refresh = () => {
      const next = toLocalDateKey();
      setDateKey((current) => (current === next ? current : next));
    };
    const interval = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return dateKey;
}
