import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 프로젝트 사이트(https://<user>.github.io/school-pick/)로 배포되므로
// base 를 저장소 이름에 맞춰 둔다. 해시 라우팅을 쓰기 때문에 새로고침 시 404 가 나지 않는다.
export default defineConfig({
  base: '/school-pick/',
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
