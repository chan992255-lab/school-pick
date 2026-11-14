/**
 * 나이스(NEIS) 교육정보 개방 포털 Open API 연동.
 * - 학교 검색: schoolInfo
 * - 급식 식단: mealServiceDietInfo
 *
 * 두 API 모두 인증키 없이 호출할 수 있고 `Access-Control-Allow-Origin: *` 를 돌려주기 때문에
 * 브라우저에서 직접 호출한다. (Vercel·GitHub Pages 모두 서버 프록시 없이 동작)
 */

const NEIS_BASE = 'https://open.neis.go.kr/hub';

export interface School {
  /** 시도교육청 코드 (예: B10) */
  atptCode: string;
  /** 시도교육청 이름 (예: 서울특별시교육청) */
  atptName: string;
  /** 교육청별 학교 코드 (SD_SCHUL_CODE) */
  code: string;
  name: string;
  /** 학교 종류 (고등학교 · 중학교 …) */
  kind: string;
  /** 지역 (서울특별시, 경기도 …) */
  region: string;
  address: string;
  foundation: string;
}

export interface MenuItem {
  name: string;
  /** 알레르기 유발 식품 번호 (1~19) */
  allergies: number[];
}

export interface Meal {
  /** 급식일 YYYYMMDD */
  date: string;
  /** 1 조식 · 2 중식 · 3 석식 */
  typeCode: string;
  typeName: string;
  menus: MenuItem[];
  calorie: string | null;
  nutrition: { label: string; value: string }[];
  origins: { label: string; value: string }[];
  /** 나이스 데이터 생성일 */
  updatedAt: string | null;
}

export const MEAL_TYPE_ORDER = ['1', '2', '3'];

export const MEAL_TYPE_LABEL: Record<string, string> = {
  '1': '조식',
  '2': '중식',
  '3': '석식',
};

export const MEAL_TYPE_EMOJI: Record<string, string> = {
  '1': '🌅',
  '2': '🍚',
  '3': '🌙',
};

/** 알레르기 유발 식품 번호 안내 */
export const ALLERGY_NAMES: Record<number, string> = {
  1: '난류',
  2: '우유',
  3: '메밀',
  4: '땅콩',
  5: '대두',
  6: '밀',
  7: '고등어',
  8: '게',
  9: '새우',
  10: '돼지고기',
  11: '복숭아',
  12: '토마토',
  13: '아황산류',
  14: '호두',
  15: '닭고기',
  16: '쇠고기',
  17: '오징어',
  18: '조개류',
  19: '잣',
};

const SCHOOL_STORAGE_KEY = 'school-pick.meal.school';

/* ------------------------------------------------------------------ */
/* 저장된 학교 (localStorage)                                          */
/* ------------------------------------------------------------------ */

export function loadSavedSchool(): School | null {
  try {
    const raw = window.localStorage.getItem(SCHOOL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<School> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.atptCode || !parsed.code || !parsed.name) return null;
    return {
      atptCode: String(parsed.atptCode),
      atptName: String(parsed.atptName ?? ''),
      code: String(parsed.code),
      name: String(parsed.name),
      kind: String(parsed.kind ?? '고등학교'),
      region: String(parsed.region ?? ''),
      address: String(parsed.address ?? ''),
      foundation: String(parsed.foundation ?? ''),
    };
  } catch {
    return null;
  }
}

export function saveSchool(school: School | null): void {
  try {
    if (school) window.localStorage.setItem(SCHOOL_STORAGE_KEY, JSON.stringify(school));
    else window.localStorage.removeItem(SCHOOL_STORAGE_KEY);
  } catch {
    // 저장 공간이 막혀 있어도(사생활 보호 모드 등) 화면은 그대로 동작한다.
  }
}

/* ------------------------------------------------------------------ */
/* 나이스 호출                                                          */
/* ------------------------------------------------------------------ */

interface NeisResult {
  CODE?: string;
  MESSAGE?: string;
}

interface NeisHead {
  list_total_count?: number;
  RESULT?: NeisResult;
}

type NeisRow = Record<string, unknown>;

async function neisGet(
  endpoint: string,
  params: Record<string, string>,
  pSize = 100,
): Promise<NeisRow[]> {
  const query = new URLSearchParams({
    Type: 'json',
    pIndex: '1',
    pSize: String(pSize),
    ...params,
  });

  let response: Response;
  try {
    response = await fetch(`${NEIS_BASE}/${endpoint}?${query.toString()}`);
  } catch {
    throw new Error('나이스 서버에 연결하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.');
  }

  if (!response.ok) {
    throw new Error(`나이스 서버가 응답하지 않았어요. (HTTP ${response.status})`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('나이스 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const root = payload as Record<string, unknown> | null;
  if (!root || typeof root !== 'object') return [];

  // 데이터가 없거나 오류인 경우 최상위 RESULT 만 돌아온다.
  if ('RESULT' in root) {
    const result = root.RESULT as NeisResult | undefined;
    const code = String(result?.CODE ?? '');
    if (code === 'INFO-200') return [];
    throw new Error(result?.MESSAGE ? `나이스: ${result.MESSAGE}` : '나이스에서 오류가 돌아왔어요.');
  }

  const envelope = root[endpoint] as { head?: NeisHead[]; row?: NeisRow[] }[] | undefined;
  if (!Array.isArray(envelope)) return [];

  const head = Array.isArray(envelope[0]?.head) ? envelope[0].head : [];
  const rows = Array.isArray(envelope[1]?.row) ? envelope[1].row : [];
  const result = head.find((part) => part && part.RESULT)?.RESULT;

  if (result && result.CODE && result.CODE !== 'INFO-000') {
    if (result.CODE === 'INFO-200') return [];
    throw new Error(result.MESSAGE ? `나이스: ${result.MESSAGE}` : '나이스에서 오류가 돌아왔어요.');
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* 학교 검색                                                            */
/* ------------------------------------------------------------------ */

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function rowToSchool(row: NeisRow): School {
  return {
    atptCode: text(row.ATPT_OFCDC_SC_CODE),
    atptName: text(row.ATPT_OFCDC_SC_NM),
    code: text(row.SD_SCHUL_CODE),
    name: text(row.SCHUL_NM),
    kind: text(row.SCHUL_KND_SC_NM),
    region: text(row.LCTN_SC_NM),
    address: text(row.ORG_RDNMA) || text(row.ORG_RDNDA),
    foundation: text(row.FOND_SC_NM),
  };
}

/** 고등학교를 먼저 보여 주기 위한 정렬 순위 */
function kindRank(kind: string): number {
  if (kind.includes('고등')) return 0;
  if (kind.includes('중학')) return 1;
  if (kind.includes('초등')) return 2;
  return 3;
}

export async function searchSchools(query: string): Promise<School[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  // 나이스 응답은 한 번에 5건까지만 돌아오기 때문에, 고등학교 필터를 함께 걸어
  // 이름이 같은 중·고등학교가 섞여도 고등학교가 잘리지 않게 한다.
  const [highSchools, allSchools] = await Promise.all([
    neisGet('schoolInfo', { SCHUL_NM: keyword, SCHUL_KND_SC_NM: '고등학교' }, 100).catch(
      () => [] as NeisRow[],
    ),
    neisGet('schoolInfo', { SCHUL_NM: keyword }, 100),
  ]);

  const merged = new Map<string, School>();
  for (const row of [...highSchools, ...allSchools]) {
    const school = rowToSchool(row);
    if (!school.name || !school.code || !school.atptCode) continue;
    merged.set(`${school.atptCode}-${school.code}`, school);
  }

  return [...merged.values()]
    .sort(
      (a, b) =>
        kindRank(a.kind) - kindRank(b.kind) ||
        a.region.localeCompare(b.region, 'ko') ||
        a.name.localeCompare(b.name, 'ko'),
    )
    .slice(0, 30);
}

/* ------------------------------------------------------------------ */
/* 급식 식단                                                            */
/* ------------------------------------------------------------------ */

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** "쌀밥 <br/>누들떡볶이 (1.2.5.6)" → 메뉴 목록 + 알레르기 번호 */
export function parseMenus(raw: string): MenuItem[] {
  return decodeEntities(raw)
    .split(/<br\s*\/?>/i)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((line) => {
      const matched = line.match(/^(.*?)\s*\(([\d.\s]+)\)\s*$/);
      if (!matched) return { name: line, allergies: [] };
      const allergies = matched[2]
        .split('.')
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      return { name: matched[1].trim() || line, allergies };
    });
}

function parsePairs(raw: string): { label: string; value: string }[] {
  return decodeEntities(raw)
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(':');
      if (index < 0) return { label: line, value: '' };
      return { label: line.slice(0, index).trim(), value: line.slice(index + 1).trim() };
    })
    .filter((pair) => pair.value);
}

function rowToMeal(row: NeisRow): Meal | null {
  const date = text(row.MLSV_YMD);
  const typeCode = text(row.MMEAL_SC_CODE);
  const dishes = text(row.DDISH_NM);
  if (!date || !typeCode || !dishes) return null;

  return {
    date,
    typeCode,
    typeName: text(row.MMEAL_SC_NM) || MEAL_TYPE_LABEL[typeCode] || '급식',
    menus: parseMenus(dishes),
    calorie: text(row.CAL_INFO) || null,
    nutrition: parsePairs(text(row.NTR_INFO)),
    origins: parsePairs(text(row.ORPLC_INFO)),
    updatedAt: text(row.LOAD_DTM) || null,
  };
}

/** 하루치 급식. 나이스는 한 번에 5행만 돌려주기 때문에 날짜 단위로 조회한다. */
async function fetchMealsByDate(school: School, date: string): Promise<Meal[]> {
  const rows = await neisGet(
    'mealServiceDietInfo',
    {
      ATPT_OFCDC_SC_CODE: school.atptCode,
      SD_SCHUL_CODE: school.code,
      MLSV_YMD: date,
    },
    20,
  );

  return rows.map(rowToMeal).filter((meal): meal is Meal => Boolean(meal));
}

/**
 * 여러 날짜의 급식을 병렬로(동시 6건) 가져온다.
 * 나이스 mealServiceDietInfo 는 pSize·pIndex 와 무관하게 한 번에 5행까지만 응답해서,
 * 기간 조회로는 뒤쪽 날짜가 잘린다. 그래서 날짜별 조회 후 합친다.
 */
export async function fetchMeals(school: School, dates: string[]): Promise<Meal[]> {
  const unique = [...new Set(dates)].sort();
  const CONCURRENCY = 6;
  const collected: Meal[] = [];

  for (let index = 0; index < unique.length; index += CONCURRENCY) {
    const batch = unique.slice(index, index + CONCURRENCY);
    const results = await Promise.all(batch.map((date) => fetchMealsByDate(school, date)));
    for (const meals of results) collected.push(...meals);
  }

  return collected.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      MEAL_TYPE_ORDER.indexOf(a.typeCode) - MEAL_TYPE_ORDER.indexOf(b.typeCode),
  );
}

/* ------------------------------------------------------------------ */
/* 날짜 유틸                                                            */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 오늘 날짜(한국 시간 기준)를 YYYYMMDD 로 */
export function todayYmd(): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return formatted.replace(/-/g, '');
  } catch {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
  }
}

export function ymdToDate(ymd: string): Date {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  // 시간대 보정 문제를 피하려고 정오로 만든다.
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function dateToYmd(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function addDays(ymd: string, days: number): string {
  const date = ymdToDate(ymd);
  date.setDate(date.getDate() + days);
  return dateToYmd(date);
}

/** 두 날짜의 차이(일). b - a */
export function dayDiff(a: string, b: string): number {
  return Math.round((ymdToDate(b).getTime() - ymdToDate(a).getTime()) / 86400000);
}

export function weekdayLabel(ymd: string): string {
  return WEEKDAYS[ymdToDate(ymd).getDay()];
}

export function isWeekend(ymd: string): boolean {
  const day = ymdToDate(ymd).getDay();
  return day === 0 || day === 6;
}

/** "11월 13일 (금)" */
export function dateLabel(ymd: string): string {
  const date = ymdToDate(ymd);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdayLabel(ymd)})`;
}

/** "2026년 11월 13일 (금)" */
export function fullDateLabel(ymd: string): string {
  return `${ymd.slice(0, 4)}년 ${dateLabel(ymd)}`;
}
