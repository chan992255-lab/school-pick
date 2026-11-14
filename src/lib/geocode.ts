/**
 * 주소 → 좌표 변환(지오코딩).
 *
 * 나이스(NEIS)는 학교 주소는 주지만 좌표는 주지 않는다. 지도 데이터에 없는 학교를
 * 검색했을 때만 (학교당 한 번) OpenStreetMap Nominatim → Photon 순서로 시도한다.
 * 두 서비스 모두 키 없이 브라우저에서 부를 수 있고, 결과는 메모리에 기억해 둔다.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

const cache = new Map<string, GeoPoint | null>();

async function fromNominatim(address: string): Promise<GeoPoint | null> {
  const query = new URLSearchParams({
    q: address,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'kr',
    'accept-language': 'ko',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as { lat?: string; lon?: string }[];
  const first = Array.isArray(rows) ? rows[0] : null;
  const lat = Number(first?.lat);
  const lon = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

async function fromPhoton(address: string): Promise<GeoPoint | null> {
  const query = new URLSearchParams({ q: address, limit: '1', lang: 'ko' });
  const response = await fetch(`https://photon.komoot.io/api/?${query.toString()}`);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    features?: { geometry?: { coordinates?: [number, number] }; properties?: { countrycode?: string } }[];
  };
  const feature = data.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!coords) return null;
  if (feature?.properties?.countrycode && feature.properties.countrycode !== 'KR') return null;
  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const key = address.replace(/\s+/g, ' ').trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  let point: GeoPoint | null = null;
  try {
    point = await fromNominatim(key);
  } catch {
    point = null;
  }
  if (!point) {
    try {
      point = await fromPhoton(key);
    } catch {
      point = null;
    }
  }
  cache.set(key, point);
  return point;
}
