/* 스쿨픽 서비스 워커
 *
 * 목표는 "홈 화면에 설치" 요건을 채우면서, 캐시 때문에 앱이나 데이터가
 * 낡아 보이는 일이 없도록 하는 것이다.
 *  - 설치 시 skipWaiting(), 활성화 시 clients.claim() 으로 새 버전을 바로 적용
 *  - 같은 출처의 GET 요청만 network-first 로 다루고(성공 응답만 캐시에 갱신),
 *    네트워크가 끊겼을 때만 캐시로 대신한다.
 *  - Supabase API(다른 출처)와 GET 이 아닌 요청은 그대로 통과시킨다.
 */

const CACHE_NAME = 'school-pick-v1';

self.addEventListener('install', () => {
  // 새 서비스 워커가 대기하지 않고 곧바로 활성화되게 한다.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 이전 버전 캐시 정리
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET 이외의 요청(업로드, 로그인 등)은 브라우저 기본 동작에 맡긴다.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase API·스토리지, CDN 등 다른 출처는 캐시하지 않고 그대로 보낸다.
  if (url.origin !== self.location.origin) return;

  // 서비스 워커 파일 자체는 항상 네트워크에서 가져온다.
  if (url.pathname.endsWith('/sw.js')) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // 정상 응답만 캐시에 남겨 두어, 오류 화면이 캐시로 굳지 않게 한다.
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}
