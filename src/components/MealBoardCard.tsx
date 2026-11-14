import { useMemo } from 'react';
import { ArrowRight, UtensilsCrossed } from 'lucide-react';
import {
  MEAL_TYPE_EMOJI,
  addDays,
  dateLabel,
  dayDiff,
  loadSavedSchool,
  todayYmd,
} from '../lib/neis';
import { useMeals } from '../lib/useMeals';

/**
 * 급식 게시판 위에 붙는 오늘의 급식 요약 카드.
 * 학교를 아직 고르지 않았으면 등록을, 급식이 없으면 가장 가까운 급식일을 안내한다.
 */
export function MealBoardCard({ onOpen }: { onOpen: () => void }) {
  const school = useMemo(() => loadSavedSchool(), []);
  const today = useMemo(() => todayYmd(), []);
  const dates = useMemo(() => {
    const from = addDays(today, -3);
    const total = dayDiff(from, addDays(today, 7));
    return Array.from({ length: total + 1 }, (_, index) => addDays(from, index));
  }, [today]);
  const { meals, loading } = useMeals(school, dates);

  const todayMeals = meals.filter((meal) => meal.date === today);
  const mainMeal = todayMeals.find((meal) => meal.typeCode === '2') ?? todayMeals[0] ?? null;
  const nextMeal = meals.find((meal) => meal.date > today) ?? null;

  return (
    <section className="card mb-4 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <UtensilsCrossed className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">
            오늘의 급식
            {school && (
              <span className="truncate font-semibold normal-case tracking-normal text-zinc-500 dark:text-zinc-400">
                · {school.name}
              </span>
            )}
          </p>

          {!school ? (
            <p className="mt-1 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300">
              우리 학교를 등록하면 오늘 급식 메뉴가 여기에 바로 떠요.
            </p>
          ) : loading && !meals.length ? (
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">급식을 불러오는 중…</p>
          ) : mainMeal ? (
            <>
              <p className="mt-1 line-clamp-2 text-[13.5px] font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                {mainMeal.menus
                  .slice(0, 4)
                  .map((menu) => menu.name)
                  .join(' · ')}
                {mainMeal.menus.length > 4 ? ` 외 ${mainMeal.menus.length - 4}개` : ''}
              </p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                {MEAL_TYPE_EMOJI[mainMeal.typeCode] ?? ''} {mainMeal.typeName}
                {mainMeal.calorie ? ` · ${mainMeal.calorie}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300">
              오늘은 급식이 없어요.
              {nextMeal
                ? ` ${dateLabel(nextMeal.date)} ${nextMeal.typeName} 메뉴를 미리 볼 수 있어요.`
                : ''}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-center gap-1 border-t border-zinc-100 bg-zinc-50/70 py-2.5 text-[12.5px] font-bold text-brand-700 transition hover:bg-brand-50 dark:border-white/10 dark:bg-white/5 dark:text-brand-200 dark:hover:bg-white/10"
      >
        {school ? '급식표 전체 보기' : '학교 등록하고 오늘 급식 보기'}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}
