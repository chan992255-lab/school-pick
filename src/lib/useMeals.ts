import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMeals, type Meal, type School } from './neis';

/**
 * 선택한 학교의 날짜별 급식을 불러오는 훅.
 * 이미 받아 둔 날짜는 기기에 남겨 두고, 새로 필요한 날짜만 요청한다.
 */
export function useMeals(school: School | null, dates: string[]) {
  const [cache, setCache] = useState<Record<string, Meal[]>>({});
  const cacheRef = useRef<Record<string, Meal[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const key = dates.join(',');

  // 학교가 바뀌면 이전 학교의 급식을 버린다.
  useEffect(() => {
    cacheRef.current = {};
    setCache({});
    setLoading(false);
    setError(null);
  }, [school?.code]);

  useEffect(() => {
    if (!school) return;

    const missing = dates.filter((date) => !cacheRef.current[date]);
    if (!missing.length) return;

    let alive = true;
    setLoading(true);
    setError(null);

    fetchMeals(school, missing)
      .then((rows) => {
        if (!alive) return;
        const grouped: Record<string, Meal[]> = {};
        for (const date of missing) grouped[date] = [];
        for (const meal of rows) {
          const list = grouped[meal.date];
          if (list) list.push(meal);
        }
        cacheRef.current = { ...cacheRef.current, ...grouped };
        setCache(cacheRef.current);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : '급식 정보를 불러오지 못했어요.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school?.code, school?.atptCode, key, reloadKey]);

  const refresh = useCallback(() => {
    cacheRef.current = {};
    setCache({});
    setReloadKey((current) => current + 1);
  }, []);

  const meals = useMemo(() => Object.values(cache).flat(), [cache]);

  return { meals, loading, error, refresh };
}
