import { useCallback, useEffect, useState } from 'react';
import { fetchMeals, type Meal, type School } from './neis';

/**
 * 선택한 학교의 기간별 급식 식단을 불러오는 훅.
 * from·to 는 YYYYMMDD.
 */
export function useMeals(school: School | null, from: string, to: string) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!school) {
      setMeals([]);
      setError(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    fetchMeals(school, from, to)
      .then((rows) => {
        if (!alive) return;
        setMeals(rows);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setMeals([]);
        setError(err instanceof Error ? err.message : '급식 정보를 불러오지 못했어요.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [school?.atptCode, school?.code, from, to, reloadKey]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  return { meals, loading, error, refresh };
}
