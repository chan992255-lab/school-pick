import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  PenLine,
  RefreshCw,
  Search,
  School as SchoolIcon,
  UtensilsCrossed,
} from 'lucide-react';
import { SchoolSearch } from '../components/SchoolSearch';
import { useUI } from '../context/UIContext';
import {
  ALLERGY_NAMES,
  MEAL_TYPE_EMOJI,
  MEAL_TYPE_ORDER,
  addDays,
  dateLabel,
  dayDiff,
  fullDateLabel,
  isWeekend,
  loadSavedSchool,
  saveSchool,
  todayYmd,
  weekdayLabel,
  type Meal,
  type School,
} from '../lib/neis';
import { useMeals } from '../lib/useMeals';

export function MealPage() {
  const { openUpload } = useUI();
  const [school, setSchool] = useState<School | null>(() => loadSavedSchool());
  const [editingSchool, setEditingSchool] = useState(false);
  const [selected, setSelected] = useState<string>(() => todayYmd());
  const [anchor, setAnchor] = useState<string>(() => todayYmd());
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [showAllergy, setShowAllergy] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const today = useMemo(() => todayYmd(), []);

  // 선택한 날짜를 가운데 두고 앞뒤 4주치를 한 번에 받아 둔다(주간 이동·가장 가까운 급식일 찾기용).
  const range = useMemo(() => ({ from: addDays(anchor, -8), to: addDays(anchor, 21) }), [anchor]);
  const { meals, loading, error, refresh } = useMeals(school, range.from, range.to);

  useEffect(() => {
    if (selected < range.from || selected > range.to) setAnchor(selected);
  }, [selected, range.from, range.to]);

  const byDate = useMemo(() => {
    const map = new Map<string, Meal[]>();
    for (const meal of meals) {
      const list = map.get(meal.date) ?? [];
      list.push(meal);
      map.set(meal.date, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => MEAL_TYPE_ORDER.indexOf(a.typeCode) - MEAL_TYPE_ORDER.indexOf(b.typeCode),
      );
    }
    return map;
  }, [meals]);

  const dayMeals = byDate.get(selected) ?? [];
  const typeKey = dayMeals.map((meal) => meal.typeCode).join(',');

  useEffect(() => {
    if (!dayMeals.length) {
      setTypeCode(null);
      return;
    }
    setTypeCode((prev) => {
      if (prev && dayMeals.some((meal) => meal.typeCode === prev)) return prev;
      const lunch = dayMeals.find((meal) => meal.typeCode === '2');
      return (lunch ?? dayMeals[0]).typeCode;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, typeKey]);

  const meal = dayMeals.find((item) => item.typeCode === typeCode) ?? dayMeals[0] ?? null;

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(selected, index - 3)),
    [selected],
  );

  const mealDates = useMemo(() => [...byDate.keys()].sort(), [byDate]);

  const prevMealDate = useMemo(() => {
    const earlier = mealDates.filter((date) => date < selected);
    return earlier.length ? earlier[earlier.length - 1] : null;
  }, [mealDates, selected]);

  const nextMealDate = useMemo(
    () => mealDates.find((date) => date > selected) ?? null,
    [mealDates, selected],
  );

  const nearestMealDate = useMemo(() => {
    let best: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const date of mealDates) {
      const distance = Math.abs(dayDiff(selected, date));
      if (distance < bestDistance) {
        best = date;
        bestDistance = distance;
      }
    }
    return best;
  }, [mealDates, selected]);

  const allergyCodes = useMemo(() => {
    if (!meal) return [];
    return [...new Set(meal.menus.flatMap((menu) => menu.allergies))].sort((a, b) => a - b);
  }, [meal]);

  const handleSelectSchool = (next: School) => {
    saveSchool(next);
    setSchool(next);
    setEditingSchool(false);
    const now = todayYmd();
    setSelected(now);
    setAnchor(now);
  };

  const writeMealPost = () => {
    if (!meal) return;
    const lines = [
      `${fullDateLabel(selected)} ${meal.typeName}`,
      ...meal.menus.map((menu) => `· ${menu.name}`),
    ];
    if (meal.calorie) lines.push('', `칼로리 ${meal.calorie}`);
    lines.push('', '우리 학교 오늘 급식 어땠어요? 👀');
    openUpload('meal', {
      title: `${dateLabel(selected)} ${meal.typeName} 급식`,
      body: lines.join('\n'),
      tags: ['급식'],
    });
  };

  const showSearch = !school || editingSchool;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:px-6 lg:py-8">
      <div className="mb-4">
        <h1 className="section-title">급식표</h1>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          우리 학교 조식·중식·석식 메뉴를 나이스(NEIS)에서 바로 가져와요.
        </p>
      </div>

      {showSearch && (
        <section className="card mb-4 p-4 sm:p-5">
          <h2 className="flex items-center gap-1.5 text-[14px] font-extrabold text-zinc-900 dark:text-white">
            <Search className="h-4 w-4 text-brand-600 dark:text-brand-300" />
            우리 학교 찾기
          </h2>
          <p className="mt-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
            학교 이름을 검색해 선택하면 다음 방문부터 오늘 급식이 바로 떠요.
          </p>
          <div className="mt-3">
            <SchoolSearch onSelect={handleSelectSchool} autoFocus={!school} />
          </div>
          {school && (
            <button
              type="button"
              onClick={() => setEditingSchool(false)}
              className="btn-ghost mt-3 py-1.5 text-[12.5px]"
            >
              닫기
            </button>
          )}
        </section>
      )}

      {school && !editingSchool && (
        <div className="card mb-3 flex flex-wrap items-center justify-between gap-2 p-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <SchoolIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-extrabold text-zinc-900 dark:text-white">
                {school.name}
              </p>
              <p className="truncate text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                {[school.region, school.kind, school.foundation].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={refresh}
              aria-label="급식 정보 새로고침"
              className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setEditingSchool(true)}
              className="btn-soft py-1.5 text-[12px]"
            >
              학교 변경
            </button>
          </div>
        </div>
      )}

      {school && !editingSchool && (
        <>
          <div className="card mb-3 p-3">
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setSelected(addDays(selected, -1))}
                aria-label="이전 날"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-[15px] font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  {fullDateLabel(selected)}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {selected === today ? '오늘' : `${weekdayLabel(selected)}요일`}
                  {dayMeals.length > 0 ? ` · ${dayMeals.map((m) => m.typeName).join('/')}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(addDays(selected, 1))}
                aria-label="다음 날"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {week.map((date) => {
                const active = date === selected;
                const hasMeal = byDate.has(date);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date)}
                    aria-label={fullDateLabel(date)}
                    aria-current={active ? 'date' : undefined}
                    className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition ${
                      active
                        ? 'bg-brand-600 text-white shadow-float'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10'
                    } ${date === today && !active ? 'ring-1 ring-brand-300 dark:ring-brand-500/40' : ''}`}
                  >
                    <span className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-zinc-400'}`}>
                      {weekdayLabel(date)}
                    </span>
                    <span className="text-[13px] font-extrabold tabular-nums">
                      {Number(date.slice(6))}
                    </span>
                    <span
                      className={`h-1 w-1 rounded-full ${
                        hasMeal ? (active ? 'bg-white' : 'bg-brand-500') : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelected(today)}
                className="btn-ghost px-2 py-1 text-[12px]"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                오늘로
              </button>
              <span className="text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500">
                {loading ? '불러오는 중…' : mealDates.length ? '급식 있는 날은 점으로 표시' : ''}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-2xl bg-rose-50 p-3.5 text-[12.5px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={refresh} className="shrink-0 underline">
                다시 시도
              </button>
            </div>
          )}

          {loading && meals.length === 0 && !error && (
            <div className="card space-y-2.5 p-5">
              <div className="h-3 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-3.5 animate-pulse rounded-full bg-zinc-100 dark:bg-white/5"
                  style={{ width: `${88 - i * 9}%` }}
                />
              ))}
            </div>
          )}

          {!loading && !error && dayMeals.length === 0 && (
            <div className="card p-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300">
                <UtensilsCrossed className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-extrabold text-zinc-900 dark:text-white">
                {selected === today
                  ? '오늘 급식 정보가 없어요'
                  : isWeekend(selected)
                    ? '주말이라 급식이 없어요'
                    : '이 날은 급식 정보가 없어요'}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                주말·공휴일·방학·재량휴업일이면 급식이 없어요. 가까운 급식일로 이동해 볼까요?
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {nearestMealDate && (
                  <button
                    type="button"
                    onClick={() => setSelected(nearestMealDate)}
                    className="btn-primary py-2 text-[12.5px]"
                  >
                    {dateLabel(nearestMealDate)} 급식 보기
                  </button>
                )}
                <button
                  type="button"
                  disabled={!prevMealDate}
                  onClick={() => prevMealDate && setSelected(prevMealDate)}
                  className="btn-soft py-2 text-[12.5px] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  이전 급식일
                </button>
                <button
                  type="button"
                  disabled={!nextMealDate}
                  onClick={() => nextMealDate && setSelected(nextMealDate)}
                  className="btn-soft py-2 text-[12.5px] disabled:opacity-40"
                >
                  다음 급식일
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {!error && dayMeals.length > 0 && (
            <>
              {dayMeals.length > 1 && (
                <div className="mb-2 flex gap-1.5">
                  {dayMeals.map((item) => (
                    <button
                      key={item.typeCode}
                      type="button"
                      onClick={() => setTypeCode(item.typeCode)}
                      className={`chip ${typeCode === item.typeCode ? 'chip-active' : ''}`}
                    >
                      <span aria-hidden>{MEAL_TYPE_EMOJI[item.typeCode] ?? ''}</span>
                      {item.typeName}
                    </button>
                  ))}
                </div>
              )}

              {meal && (
                <div className="card overflow-hidden">
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-white/10">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[15px] font-extrabold text-zinc-900 dark:text-white">
                        <span aria-hidden>{MEAL_TYPE_EMOJI[meal.typeCode] ?? '🍚'}</span>
                        {meal.typeName}
                        {selected === today && (
                          <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                            오늘
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                        {meal.menus.length}가지 메뉴
                        {meal.calorie ? ` · ${meal.calorie}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllergy((prev) => !prev)}
                      className={`chip shrink-0 text-[11px] ${
                        showAllergy ? 'chip-active' : ''
                      }`}
                      aria-pressed={showAllergy}
                    >
                      알레르기 {showAllergy ? '숨기기' : '보기'}
                    </button>
                  </div>

                  <ul className="divide-y divide-zinc-100 px-4 dark:divide-white/10">
                    {meal.menus.map((menu, index) => (
                      <li
                        key={`${menu.name}-${index}`}
                        className="flex items-start justify-between gap-2 py-2.5"
                      >
                        <span className="flex items-baseline gap-1.5 text-[14px] font-semibold leading-snug text-zinc-800 dark:text-zinc-100">
                          <span className="text-[10px] font-bold tabular-nums text-zinc-300 dark:text-zinc-600">
                            {index + 1}
                          </span>
                          {menu.name}
                        </span>
                        {showAllergy && menu.allergies.length > 0 && (
                          <span className="flex shrink-0 flex-wrap justify-end gap-1">
                            {menu.allergies.map((code) => (
                              <span
                                key={code}
                                title={ALLERGY_NAMES[code] ?? `알레르기 ${code}`}
                                className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                              >
                                {code}
                              </span>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {showAllergy && allergyCodes.length > 0 && (
                    <p className="border-t border-zinc-100 px-4 py-2.5 text-[10.5px] leading-relaxed text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                      알레르기 유발 식품 ·{' '}
                      {allergyCodes.map((code) => `${code} ${ALLERGY_NAMES[code] ?? ''}`).join(' · ')}
                    </p>
                  )}

                  <div className="border-t border-zinc-100 px-4 py-2.5 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowDetails((prev) => !prev)}
                      className="flex w-full items-center justify-between text-[11.5px] font-bold text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
                      aria-expanded={showDetails}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Info className="h-3.5 w-3.5" />
                        원산지 · 영양 정보
                      </span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 transition ${showDetails ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {showDetails && (
                      <div className="mt-2 space-y-3 pb-1">
                        {meal.nutrition.length > 0 && (
                          <div>
                            <p className="mb-1 text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300">
                              영양 정보
                            </p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] text-zinc-500 dark:text-zinc-400">
                              {meal.nutrition.map((item) => (
                                <span key={item.label} className="flex justify-between gap-1">
                                  <span className="truncate">{item.label}</span>
                                  <span className="shrink-0 font-semibold tabular-nums">
                                    {item.value}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {meal.origins.length > 0 && (
                          <div>
                            <p className="mb-1 text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300">
                              원산지
                            </p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] text-zinc-500 dark:text-zinc-400">
                              {meal.origins.map((item) => (
                                <span key={item.label} className="flex justify-between gap-1">
                                  <span className="truncate">{item.label}</span>
                                  <span className="shrink-0 font-semibold">{item.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {meal.nutrition.length === 0 && meal.origins.length === 0 && (
                          <p className="text-[11px] text-zinc-400">
                            이 날은 원산지·영양 정보가 제공되지 않아요.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10.5px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                      자료: 나이스(NEIS) 교육정보 개방 포털
                      {meal.updatedAt ? ` · ${meal.updatedAt} 업데이트` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={writeMealPost}
                      className="btn-primary py-2 text-[12.5px]"
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      {selected === today ? '오늘 급식 글쓰기' : '이 날 급식 글쓰기'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!prevMealDate}
                  onClick={() => prevMealDate && setSelected(prevMealDate)}
                  className="btn-ghost py-1.5 text-[12px] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  이전 급식일
                </button>
                <button
                  type="button"
                  disabled={!nextMealDate}
                  onClick={() => nextMealDate && setSelected(nextMealDate)}
                  className="btn-ghost py-1.5 text-[12px] disabled:opacity-40"
                >
                  다음 급식일
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
