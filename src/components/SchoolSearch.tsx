import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MapPin, School as SchoolIcon, Search } from 'lucide-react';
import { searchSchools, type School } from '../lib/neis';

/**
 * 나이스(NEIS)에서 우리 학교를 찾는 검색 상자.
 * 동명 학교가 여러 지역에 있을 수 있어 지역·교육청·주소를 함께 보여 준다.
 */
export function SchoolSearch({
  onSelect,
  autoFocus = false,
}: {
  onSelect: (school: School) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      setError(null);
      setSearched(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setError(null);

    searchSchools(debounced)
      .then((schools) => {
        if (!alive) return;
        setResults(schools);
        setSearched(true);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setResults([]);
        setError(err instanceof Error ? err.message : '학교를 검색하지 못했어요.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [debounced]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={autoFocus}
          placeholder="예: 문정고등학교"
          aria-label="학교 이름 검색"
          className="field py-2.5 pl-10 pr-10 text-[13.5px]"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-500" />
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
        나이스(NEIS) 교육정보 개방 포털에서 학교를 찾아요. 한 번 선택하면 이 기기에 기억해 둬요.
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-[12.5px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!error && searched && results.length === 0 && !loading && (
        <p className="mt-4 rounded-2xl bg-zinc-50 px-3 py-3 text-[12.5px] text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
          '{debounced}' 검색 결과가 없어요. 학교 이름을 조금 더 정확히 적어 보세요. (예: 문정고등학교)
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-2xl border border-zinc-200 dark:divide-white/10 dark:border-white/10">
          {results.map((school) => (
            <li key={`${school.atptCode}-${school.code}`}>
              <button
                type="button"
                onClick={() => onSelect(school)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-brand-50/60 dark:hover:bg-white/5"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-zinc-100 text-[11px] font-extrabold text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
                  {school.kind.includes('고등') ? (
                    <SchoolIcon className="h-4 w-4" />
                  ) : (
                    school.kind.slice(0, 1) || '학'
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-bold text-zinc-900 dark:text-zinc-100">
                      {school.name}
                    </span>
                    {school.kind.includes('고등') && (
                      <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                        고등학교
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {school.region || school.atptName}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                    <span>{school.kind}</span>
                    {school.foundation && (
                      <>
                        <span className="text-zinc-300 dark:text-zinc-600">·</span>
                        <span>{school.foundation}</span>
                      </>
                    )}
                  </span>
                  {school.address && (
                    <span className="mt-0.5 block truncate text-[10.5px] text-zinc-400 dark:text-zinc-500">
                      {school.address}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
