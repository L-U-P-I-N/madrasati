'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';

/** جلب بيانات بسيط مع إعادة تحميل يدوية — يغطي كل شاشات القراءة هنا. */
export function useApi<T>(path: string | null, query?: Record<string, string | number | boolean | undefined>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(query ?? {});

  const reload = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setData(await api.get<T>(path, JSON.parse(key)));
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('تعذّر جلب البيانات.', 0));
    } finally {
      setLoading(false);
    }
  }, [path, key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
