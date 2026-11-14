import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertCircle,
  Check,
  Loader2,
  Locate,
  MapPin,
  School as SchoolIcon,
  Search,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { geocodeAddress } from '../lib/geocode';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  REGIONS,
  REGION_COUNTS,
  SCHOOLS,
  SCHOOL_TOTAL,
  findLocal,
  searchLocal,
  type MapSchool,
  type RegionName,
} from '../lib/schools';
import { fetchMeals, addDays, dateLabel, loadSavedSchool, saveSchool, searchSchools, todayYmd, type Meal, type School } from '../lib/neis';

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface Target {
  name: string;
  lat: number;
  lon: number;
  region: string;
  /** 나이스에서 이미 확인한 학교 정보 (있으면 다시 찾지 않는다) */
  neis?: School;
}

interface Hit {
  id: string;
  name: string;
  region: string;
  address?: string;
  local?: MapSchool;
  neis?: School;
}

/** 지도에 뿌린 학교 핀의 색 */
const PIN_COLOR = { light: '#5a3df5', dark: '#8b82ff' } as const;

function mealSummary(meal: Meal | null): string {
  if (!meal) return '';
  const names = meal.menus.map((menu) => menu.name);
  if (!names.length) return '';
  const head = names.slice(0, 4).join(' · ');
  return names.length > 4 ? `${head} 외 ${names.length - 4}가지` : head;
}

export function MapPage({ onOpenMeal }: { onOpenMeal: () => void }) {
  const { theme } = useTheme();
  const { toast } = useToast();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightRef = useRef<L.Marker | null>(null);
  const neisCacheRef = useRef<Map<string, School | null>>(new Map());

  const [region, setRegion] = useState<RegionName>('전체');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [neis, setNeis] = useState<School | null>(null);
  const [neisState, setNeisState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [mealState, setMealState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [saved, setSaved] = useState<School | null>(() => loadSavedSchool());

  /* ---------------- 지도 준비 ---------------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false,
      preferCanvas: true,
      maxBounds: [
        [31.5, 122.0],
        [40.5, 134.0],
      ],
      maxBoundsViscosity: 0.4,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);
    // 데스크톱에서만 확대/축소 버튼을 둔다(모바일은 핀치 줌).
    if (window.matchMedia('(min-width: 1024px)').matches) {
      L.control.zoom({ position: 'bottomleft' }).addTo(map);
    }
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resize = window.setTimeout(() => map.invalidateSize(), 220);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      highlightRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tiles = L.tileLayer(theme === 'dark' ? DARK_TILES : LIGHT_TILES, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true,
    });
    tiles.addTo(map);
    return () => {
      tiles.remove();
    };
  }, [theme]);

  /* ---------------- 학교 핀 ---------------- */

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const list = region === '전체' ? SCHOOLS : SCHOOLS.filter((school) => school.region === region);
    const color = theme === 'dark' ? PIN_COLOR.dark : PIN_COLOR.light;

    for (const school of list) {
      const marker = L.circleMarker([school.lat, school.lon], {
        radius: 4,
        weight: 1,
        color: '#ffffff',
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.85,
      });
      marker.on('click', () => {
        setSearchOpen(false);
        setTarget({ name: school.name, lat: school.lat, lon: school.lon, region: school.region });
      });
      layer.addLayer(marker);
    }
  }, [region, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const list = region === '전체' ? SCHOOLS : SCHOOLS.filter((school) => school.region === region);
    if (!list.length) return;
    const bounds = L.latLngBounds(list.map((school) => [school.lat, school.lon] as [number, number]));
    map.flyToBounds(bounds, {
      padding: [28, 28],
      maxZoom: region === '전체' ? DEFAULT_ZOOM : 11,
      duration: 0.7,
    });
  }, [region]);

  /* ---------------- 선택한 학교 표시 ---------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (highlightRef.current) {
      highlightRef.current.remove();
      highlightRef.current = null;
    }
    if (!target) return;
    const icon = L.divIcon({
      className: 'school-pin-wrap',
      html: '<span class="school-pin"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 22],
    });
    const marker = L.marker([target.lat, target.lon], { icon, keyboard: false, zIndexOffset: 800 })
      .addTo(map)
      .bindTooltip(target.name, {
        permanent: true,
        direction: 'top',
        offset: [0, -22],
        className: 'school-tip',
      });
    highlightRef.current = marker;
  }, [target]);

  /* ---------------- 나이스 학교 정보 + 오늘 급식 ---------------- */

  const resolveNeis = useCallback(async (next: Target): Promise<School | null> => {
    const key = `${next.name}|${next.region}`;
    if (neisCacheRef.current.has(key)) return neisCacheRef.current.get(key) ?? null;

    let picked: School | null = null;
    try {
      const list = await searchSchools(next.name);
      const exact = list.filter((school) => school.name === next.name);
      const pool = exact.length ? exact : list;
      const short = next.region.slice(0, 2);
      picked = pool.find((school) => !short || school.region.startsWith(short)) ?? pool[0] ?? null;
    } catch {
      picked = null;
    }
    neisCacheRef.current.set(key, picked);
    return picked;
  }, []);

  useEffect(() => {
    if (!target) {
      setNeis(null);
      setNeisState('idle');
      setMeals(null);
      setMealState('idle');
      return;
    }

    let alive = true;
    setMeals(null);
    setNeis(target.neis ?? null);
    setNeisState(target.neis ? 'ready' : 'loading');
    setMealState('loading');

    const run = async () => {
      let school = target.neis ?? null;
      if (!school) {
        school = await resolveNeis(target);
        if (!alive) return;
        setNeis(school);
        setNeisState(school ? 'ready' : 'error');
      }
      if (!school) {
        setMealState('idle');
        return;
      }
      try {
        const today = todayYmd();
        const rows = await fetchMeals(school, [today, addDays(today, 1), addDays(today, 2)]);
        if (!alive) return;
        setMeals(rows);
        setMealState('ready');
      } catch {
        if (!alive) return;
        setMealState('error');
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [target, resolveNeis]);

  /* ---------------- 검색 ---------------- */

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setHits([]);
      setSearching(false);
      return;
    }

    const local = searchLocal(keyword, 6);
    const localHits: Hit[] = local.map((school) => ({
      id: school.id,
      name: school.name,
      region: school.region,
      local: school,
    }));
    setHits(localHits);
    setSearching(true);

    let alive = true;
    const timer = window.setTimeout(() => {
      searchSchools(keyword)
        .then((list) => {
          if (!alive) return;
          const seen = new Set(local.map((school) => `${school.name.replace(/\s+/g, '')}|${school.region.slice(0, 2)}`));
          const extra: Hit[] = list
            .filter((school) => !seen.has(`${school.name.replace(/\s+/g, '')}|${school.region.slice(0, 2)}`))
            .slice(0, 6)
            .map((school) => ({
              id: `${school.atptCode}-${school.code}`,
              name: school.name,
              region: school.region || school.atptName,
              address: school.address,
              neis: school,
            }));
          if (extra.length) setHits([...localHits, ...extra]);
        })
        .catch(() => {
          // 나이스가 응답하지 않아도 지도 데이터 검색 결과는 그대로 보여 준다.
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 260);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const openTarget = useCallback(
    (next: Target) => {
      setTarget(next);
      setSearchOpen(false);
      window.setTimeout(() => {
        mapRef.current?.flyTo([next.lat, next.lon], 14, { duration: 0.9 });
      }, 60);
    },
    [],
  );

  const chooseHit = useCallback(
    async (hit: Hit) => {
      setQuery(hit.name);
      setSearchOpen(false);
      if (hit.local) {
        openTarget({
          name: hit.local.name,
          lat: hit.local.lat,
          lon: hit.local.lon,
          region: hit.local.region,
        });
        return;
      }
      const school = hit.neis;
      if (!school) return;
      setSearching(true);
      const point = await geocodeAddress(school.address || school.name);
      setSearching(false);
      if (!point) {
        toast('이 학교의 위치를 지도에서 찾지 못했어요. 급식표 화면에서 검색해 보세요.', 'error');
        return;
      }
      openTarget({
        name: school.name,
        lat: point.lat,
        lon: point.lon,
        region: school.region || '',
        neis: school,
      });
    },
    [openTarget, toast],
  );

  const goToMySchool = useCallback(async () => {
    if (!saved) return;
    const local = findLocal(saved.name, saved.region);
    if (local) {
      openTarget({ name: local.name, lat: local.lat, lon: local.lon, region: local.region, neis: saved });
      return;
    }
    const point = await geocodeAddress(saved.address || saved.name);
    if (!point) {
      toast('내 학교 위치를 찾지 못했어요. 학교 이름으로 검색해 주세요.', 'error');
      return;
    }
    openTarget({ name: saved.name, lat: point.lat, lon: point.lon, region: saved.region, neis: saved });
  }, [saved, openTarget, toast]);

  const saveAsMySchool = useCallback(() => {
    if (!neis) return;
    saveSchool(neis);
    setSaved(neis);
    toast(`${neis.name}을(를) 내 학교로 저장했어요.`, 'success');
  }, [neis, toast]);

  const isSavedSchool = Boolean(neis && saved && saved.code === neis.code && saved.atptCode === neis.atptCode);
  const today = todayYmd();
  const todayMeal = meals?.find((meal) => meal.date === today && meal.typeCode === '2') ?? meals?.find((meal) => meal.date === today) ?? null;
  // 오늘이 주말·휴일이라 급식이 없으면 가장 가까운 다음 급식일을 보여 준다.
  const nextMeal = todayMeal ? null : (meals?.find((meal) => meal.date > today) ?? null);
  const previewMeal = todayMeal ?? nextMeal;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" aria-label="전국 고등학교 지도" />

      {/* 상단: 검색 · 지역 필터 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[450] px-3 pt-3 lg:px-6 lg:pt-5">
        <div className="pointer-events-auto mx-auto w-full max-w-xl">
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="학교 이름 검색 (예: 문정고등학교)"
                aria-label="고등학교 검색"
                className="field h-11 rounded-2xl border-zinc-200/70 bg-white/95 py-0 pl-9 pr-9 text-[13.5px] shadow-card backdrop-blur dark:border-white/10 dark:bg-zinc-900/95"
              />
              {searching ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-500" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setHits([]);
                    setSearchOpen(false);
                  }}
                  aria-label="검색어 지우기"
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {searchOpen && query.trim() && (
                <div className="absolute inset-x-0 top-[3.1rem] z-[600] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-float dark:border-white/10 dark:bg-zinc-900">
                  {hits.length === 0 && !searching ? (
                    <p className="px-3.5 py-3 text-[12.5px] text-zinc-500 dark:text-zinc-400">
                      '{query.trim()}'에 맞는 학교를 찾지 못했어요.
                    </p>
                  ) : (
                    <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto dark:divide-white/10">
                      {hits.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            onClick={() => void chooseHit(hit)}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-brand-50/70 dark:hover:bg-white/5"
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                              <SchoolIcon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
                                {hit.name}
                              </span>
                              <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {[hit.region, hit.address].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="border-t border-zinc-100 px-3.5 py-2 text-[10.5px] text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                    전국 {SCHOOL_TOTAL.toLocaleString()}곳 지도 데이터 + 나이스(NEIS) 검색
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void goToMySchool()}
              disabled={!saved}
              aria-label="내 학교로 이동"
              title={saved ? `${saved.name}으로 이동` : '내 학교를 먼저 설정해 주세요'}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-zinc-200/70 bg-white/95 text-brand-600 shadow-card backdrop-blur transition active:scale-95 disabled:text-zinc-300 dark:border-white/10 dark:bg-zinc-900/95 dark:text-brand-300 dark:disabled:text-zinc-600"
            >
              <Locate className="h-4 w-4" />
            </button>
          </div>

          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {REGIONS.map((name) => {
              const active = region === name;
              const count = name === '전체' ? SCHOOL_TOTAL : (REGION_COUNTS[name] ?? 0);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setRegion(name)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-bold shadow-sm backdrop-blur transition ${
                    active
                      ? 'border-brand-500 bg-brand-600 text-white'
                      : 'border-zinc-200/70 bg-white/90 text-zinc-600 hover:bg-white dark:border-white/10 dark:bg-zinc-900/85 dark:text-zinc-300'
                  }`}
                >
                  {name}
                  <span className={`ml-1 text-[10px] font-semibold ${active ? 'text-white/70' : 'text-zinc-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 선택한 학교 카드 */}
      {target && (
        <div className="absolute inset-x-0 bottom-0 z-[480] lg:inset-x-auto lg:bottom-6 lg:left-6 lg:w-[380px]">
          <div className="animate-sheet-up max-h-[48vh] overflow-y-auto rounded-t-3xl border border-zinc-200/80 bg-white shadow-float lg:max-h-[70vh] lg:rounded-3xl dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-start gap-2.5 px-4 pt-3.5">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <SchoolIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-extrabold text-zinc-900 dark:text-white">
                    {target.name}
                  </span>
                  {target.region && (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
                      {target.region}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {neis?.address || (neisState === 'loading' ? '학교 정보를 불러오는 중…' : '주소 정보 없음')}
                  </span>
                </p>
                {neis && (
                  <p className="mt-0.5 truncate text-[10.5px] text-zinc-400 dark:text-zinc-500">
                    {[neis.region, neis.kind, neis.foundation].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTarget(null)}
                aria-label="학교 카드 닫기"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 오늘 급식 미리보기 */}
            <div className="mx-4 mt-3 rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-zinc-700 dark:text-zinc-200">
                <UtensilsCrossed className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />
                {todayMeal ? '오늘 급식' : nextMeal ? '다음 급식' : '오늘 급식'}
                {previewMeal && (
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-white/10 dark:text-brand-200">
                    {nextMeal ? `${dateLabel(nextMeal.date)} ${previewMeal.typeName}` : previewMeal.typeName}
                  </span>
                )}
              </p>

              {mealState === 'loading' && (
                <div className="mt-1.5 space-y-1.5">
                  <span className="block h-3 w-4/5 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
                  <span className="block h-3 w-3/5 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
                </div>
              )}

              {mealState === 'ready' && previewMeal && (
                <>
                  <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-zinc-700 dark:text-zinc-200">
                    {mealSummary(previewMeal)}
                  </p>
                  {previewMeal.calorie && (
                    <p className="mt-1 text-[10.5px] font-semibold text-zinc-400 dark:text-zinc-500">
                      {previewMeal.calorie}
                    </p>
                  )}
                </>
              )}

              {mealState === 'ready' && !previewMeal && (
                <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                  오늘은 급식 정보가 없어요. (주말·공휴일·방학)
                </p>
              )}

              {mealState === 'error' && (
                <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-rose-600 dark:text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  급식 정보를 불러오지 못했어요
                </p>
              )}

              {mealState === 'idle' && (
                <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                  나이스에서 이 학교 정보를 찾지 못했어요. 급식표 화면에서 직접 검색해 주세요.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4 pt-3">
              <button type="button" onClick={onOpenMeal} className="btn-primary flex-1 py-2.5 text-[12.5px]">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                급식표 전체 보기
              </button>
              {isSavedSchool ? (
                <span className="btn-soft flex-1 py-2.5 text-[12.5px]">
                  <Check className="h-3.5 w-3.5" />
                  내 학교
                </span>
              ) : (
                <button
                  type="button"
                  onClick={saveAsMySchool}
                  disabled={!neis}
                  className="btn-soft flex-1 py-2.5 text-[12.5px] disabled:opacity-50"
                >
                  내 학교로 설정
                </button>
              )}
            </div>

            <p className="border-t border-zinc-100 px-4 py-2 text-[10px] text-zinc-400 dark:border-white/10 dark:text-zinc-500">
              지도: OpenStreetMap · 학교 정보·급식: 나이스(NEIS) 교육정보 개방 포털
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
