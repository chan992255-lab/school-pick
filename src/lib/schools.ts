import raw from '../data/schools.json';

/**
 * 전국 고등학교 지도 데이터.
 * OpenStreetMap 대한민국 추출본에서 학교(노드·학교 부지)를 뽑아
 * 시·도 경계로 지역을 붙인 목록이다. `src/data/schools.json` 은
 * [학교명, 위도, 경도, 시·도] 형태의 배열이다.
 */
export interface MapSchool {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** 짧은 지역 이름 (서울 · 경기 · 제주 …) */
  region: string;
}

export const REGIONS = [
  '전체',
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '대전',
  '광주',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
] as const;

export type RegionName = (typeof REGIONS)[number];

const rows = raw as [string, number, number, string][];

export const SCHOOLS: MapSchool[] = rows.map(([name, lat, lon, region], index) => ({
  id: `${name}-${index}`,
  name,
  lat,
  lon,
  region,
}));

/** 시·도별 학교 수 */
export const REGION_COUNTS: Record<string, number> = SCHOOLS.reduce<Record<string, number>>(
  (acc, school) => {
    acc[school.region] = (acc[school.region] ?? 0) + 1;
    return acc;
  },
  {},
);

export const SCHOOL_TOTAL = SCHOOLS.length;

/** 지도 첫 화면 (대한민국 전체가 보이도록) */
export const DEFAULT_CENTER: [number, number] = [36.35, 127.85];
export const DEFAULT_ZOOM = 7;

const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase();

/** 입력한 글자로 시작하는 학교를 먼저, 그다음 이름에 포함하는 학교를 돌려준다. */
export function searchLocal(query: string, limit = 8): MapSchool[] {
  const keyword = normalize(query);
  if (!keyword || keyword.length < 1) return [];
  const starts: MapSchool[] = [];
  const contains: MapSchool[] = [];
  for (const school of SCHOOLS) {
    const name = normalize(school.name);
    if (name.startsWith(keyword)) {
      starts.push(school);
      if (starts.length >= limit) break;
    } else if (contains.length < limit && name.includes(keyword)) {
      contains.push(school);
    }
  }
  return [...starts, ...contains].slice(0, limit);
}

/** 이름(과 지역)으로 지도 데이터에서 학교를 찾는다. */
export function findLocal(name: string, region?: string): MapSchool | null {
  const target = normalize(name);
  if (!target) return null;
  const sameName = SCHOOLS.filter((school) => normalize(school.name) === target);
  if (!sameName.length) return null;
  if (!region) return sameName[0];
  const short = region.slice(0, 2);
  return (
    sameName.find((school) => school.region === region) ??
    sameName.find((school) => school.region.startsWith(short)) ??
    sameName[0]
  );
}
