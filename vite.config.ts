import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel 에서는 도메인 루트(/), GitHub Pages 프로젝트 사이트에서는 저장소 이름 하위
// 경로(/school-pick/)로 서비스된다. Vercel 은 빌드 과정에서 VERCEL 환경변수를 넣어 준다.
// (tsconfig 의 types 가 vite/client 만이라 Node 전역 process 는 직접 선언해 둔다.)
declare const process: { env: Record<string, string | undefined> };

// GitHub Pages 는 해시 라우팅을 쓰기 때문에 새로고침 시 404 가 나지 않는다.
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/school-pick/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
