# 스쿨픽 (School Pick)

> 고등학생을 위한 **우리 학교 오늘 급식표** 와 **일상 · 급식 후기 · 공부 질문 커뮤니티**를 하나로 합친 모바일 퍼스트 웹앱입니다.

React + TypeScript + Vite + Tailwind CSS 로 만들었고, 백엔드는 **Supabase**(인증 · Postgres · Storage)를 사용합니다.
Supabase 키를 아직 넣지 않아도 앱은 **데모 모드**로 바로 실행되며, 모든 화면과 상호작용을 그대로 확인할 수 있습니다.

---

## 1. 주요 기능

### 오늘의 급식표 (나이스 NEIS 연동)
- 나이스 교육정보 개방 포털 Open API 로 학교 검색 · 급식 식단 조회 (인증키 없이 브라우저에서 직접 호출)
- 우리 학교를 한 번 선택하면 `localStorage` 에 저장돼 다음 방문부터 오늘 급식이 바로 표시 (언제든 학교 변경)
- 날짜 이동(이전 날 · 오늘 · 다음 날) + 7일 주간 스트립, 급식이 있는 날은 점으로 표시
- 조식 · 중식 · 석식 구분, 칼로리, 메뉴별 알레르기 번호 배지(토글) 와 번호별 유발 식품 안내
- 원산지 · 영양 정보 접기/펼치기, 최근 4주 범위에서 이전/다음 급식일 · 가장 가까운 급식일로 이동
- 주말 · 휴일 · 방학처럼 급식이 없으면 "오늘 급식 정보가 없어요" 안내와 이동 버튼
- **오늘 급식 글쓰기**: 오늘 메뉴를 급식 게시판 글쓰기 폼에 자동으로 채워 공유

### 고등학생 커뮤니티
- 게시판 탭: **전체 / 일상·자유 / 급식 / 공부·질문(Q&A)** (급식 게시판 상단에는 오늘 급식 요약 카드)
- 글쓰기(제목 · 본문 · 사진 첨부 · 태그), 검색(300ms 디바운스)
- 글 상세 모달에서 좋아요 · 댓글 · 저장 · 공유(딥링크 `#/post/{id}`) · 본인 글 삭제

### 프로필 · 인증
- 이메일/비밀번호 회원가입 · 로그인 (닉네임, 학교, 1~3학년)
- 프로필: 소개 · 학교 · 학년 수정, 내 글 / 저장한 글, 받은 좋아요 수
- 라이트 / 다크 테마 토글 (시스템 설정 자동 감지 + 저장)

### 그 외
- 데스크톱 사이드바 + 모바일 하단 탭 내비게이션 (반응형)
- Supabase 환경변수가 없을 때 **설정 안내 배너** + 브라우저 저장소 기반 데모 백엔드
- 낙관적 UI 업데이트, 토스트 알림, 스켈레톤 로딩, 빈 상태 화면, 접근성 라벨

---

## 2. 빠른 시작

```bash
cd projects/school-pick
npm install
npm run dev          # http://localhost:5173
```

빌드 확인:

```bash
npm run build        # tsc --noEmit && vite build
npm run preview
```

### Supabase 연결 (실제 백엔드 사용)

1. [Supabase](https://supabase.com/dashboard) 에서 새 프로젝트를 만듭니다.
2. **SQL Editor** 를 열고 [`supabase/schema.sql`](./supabase/schema.sql) 전체를 붙여넣고 실행합니다.
   - `profiles`, `posts`, `comments`, `likes`, `bookmarks` 테이블
   - RLS 정책 (읽기는 공개, 쓰기는 본인만)
   - `media` 스토리지 버킷 + 정책
   - 회원가입 시 프로필 자동 생성 트리거
3. **Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사합니다.
4. 프로젝트 루트에 `.env` 파일을 만들고 값을 넣습니다.

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

5. `npm run dev` 를 다시 시작합니다. (Vite 는 `.env` 변경 시 재시작이 필요합니다)

> 이 저장소에는 이미 라이브 프로젝트(`aafsrqffholhzdhylnui`)의 값이 `.env.production` 에 들어 있습니다.
> `npm run build` 는 별도 설정 없이 그 프로젝트에 연결됩니다.
> 로컬 개발에서도 같은 프로젝트를 쓰려면 `cp .env.production .env.local` 후 `npm run dev` 하세요.
> (`.env` 가 없으면 데모 모드로 실행됩니다.)

> 이메일 인증을 끄고 싶다면 Supabase → **Authentication → Providers → Email → Confirm email** 을 비활성화하세요.
> 인증이 켜져 있으면 가입 후 메일 확인 링크를 눌러야 로그인할 수 있습니다.

### 데모 모드

`.env` 가 없으면 자동으로 데모 모드로 실행됩니다.
- 데이터: `localStorage` (`schoolpick.demo.v1`)
- 바로 체험용 계정: **seoyeon@demo.kr / demo1234** (로그인 모달의 "데모 계정으로 둘러보기")
- 프로필 → 데모 데이터 초기화로 처음 상태로 되돌릴 수 있습니다.

---

## 3. 폴더 구조

```
projects/school-pick/
├─ index.html
├─ package.json
├─ tailwind.config.cjs
├─ postcss.config.cjs
├─ vite.config.ts
├─ tsconfig.json
├─ .env.example
├─ supabase/
│  └─ schema.sql              # 테이블 · RLS · 트리거 · 스토리지 버킷
└─ src/
   ├─ main.tsx
   ├─ App.tsx                 # 해시 라우터 + 레이아웃(사이드바/하단탭) + 모달
   ├─ index.css               # Tailwind 레이어, 공통 컴포넌트 클래스
   ├─ components/
   │  ├─ AuthModal.tsx        # 로그인 / 회원가입
   │  ├─ UploadModal.tsx      # 커뮤니티 글쓰기 (사진 1장 첨부 · 급식 메뉴 미리 채우기)
   │  ├─ PostDetailModal.tsx  # 글 상세 + 댓글
   │  ├─ SchoolSearch.tsx     # 나이스 학교 검색 (지역·교육청 함께 표시)
   │  ├─ MealBoardCard.tsx    # 급식 게시판 상단 오늘의 급식 카드
   │  ├─ PostCard.tsx         # 커뮤니티 글 카드
   │  ├─ MediaBlock.tsx       # 이미지/영상 렌더 + 오류 폴백
   │  ├─ Avatar.tsx / Logo.tsx / EmptyState.tsx / SetupBanner.tsx
   ├─ pages/
   │  ├─ CommunityPage.tsx    # 게시판 · 검색 (메인)
   │  ├─ MealPage.tsx         # 급식표 · 날짜 이동 · 알레르기/영양 정보
   │  ├─ SavedPage.tsx        # 저장한 글
   │  └─ ProfilePage.tsx      # 프로필 · 테마 · 로그아웃
   ├─ context/
   │  ├─ AuthContext.tsx
   │  ├─ ThemeContext.tsx
   │  ├─ ToastContext.tsx
   │  └─ UIContext.tsx        # 모달 · 로그인 게이팅 · 데이터 갱신
   └─ lib/
      ├─ types.ts             # 도메인 타입 + Backend 인터페이스 + 게시판/태그 상수
      ├─ supabase.ts          # 클라이언트 생성 (환경변수 없으면 null)
      ├─ supabase-backend.ts  # 실제 Supabase 구현
      ├─ demo.ts              # localStorage 데모 구현 + 샘플 데이터
      ├─ backend.ts           # 환경에 따라 백엔드 선택
      ├─ neis.ts              # 나이스 Open API(학교 검색·급식) + 날짜 유틸
      ├─ useMeals.ts          # 기간별 급식 조회 훅
      └─ format.ts            # 시간/숫자/아바타 유틸
```

---

## 4. 데이터 모델

| 테이블 | 설명 | 주요 컬럼 |
| --- | --- | --- |
| `profiles` | 학생 프로필 (auth.users 1:1) | `id`, `nickname`(유니크), `school`, `grade`(1~3), `bio`, `avatar_url` |
| `posts` | 커뮤니티 글 (사진 첨부 포함) | `kind`(media/post), `board`(daily/meal/qna), `title`, `body`, `media_url`, `media_type`, `tags[]` |
| `comments` | 댓글 | `post_id`, `author_id`, `body` |
| `likes` | 좋아요 | PK(`post_id`, `user_id`) |
| `bookmarks` | 저장 | PK(`post_id`, `user_id`) |

- **RLS**: 모든 테이블 읽기 공개(비로그인 둘러보기 허용), 쓰기/수정/삭제는 `auth.uid()` 본인만.
- **제약**: `kind='post'` 는 게시판 필수, `kind='media'` 는 게시판 없음.
- **Storage**: `media` 버킷(공개 읽기, 60MB, 이미지/영상 MIME 제한), 업로드 경로는 `{user_id}/...` 로 강제.

---

## 5. 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (5173) |
| `npm run build` | 타입 검사 + 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 (4173) |

---

## 6. 배포 (GitHub Pages)

- 저장소: <https://github.com/chan992255-lab/school-pick>
- 라이브 주소: <https://chan992255-lab.github.io/school-pick/>
- Vite `base` 가 `/school-pick/` 로 설정되어 있고, 라우팅은 해시(`#/shorts`, `#/community/qna`, `#/post/{id}`)라서 새로고침해도 404 가 나지 않습니다.
- 빌드 시 `.env.production` 이 자동으로 적용되어 라이브 Supabase 프로젝트에 연결됩니다.

### 현재 배포 방식

Pages 소스는 **`gh-pages` 브랜치**로 설정되어 있습니다(`main` 이 아닙니다).
사이트를 갱신하려면 빌드 결과를 그 브랜치에 올리면 됩니다.

```bash
npm run build

# 저장소 밖 임시 작업 공간에 gh-pages 를 꺼내 빌드 결과만 반영
git fetch origin gh-pages:gh-pages -f
git worktree add ../deploy-ghp gh-pages
find ../deploy-ghp -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. ../deploy-ghp/
touch ../deploy-ghp/.nojekyll          # Jekyll 처리 건너뛰기
cd ../deploy-ghp && git add -A && git commit -m "deploy: 스쿨픽 빌드" && git push origin HEAD:gh-pages
```

### 대안: GitHub Actions 로 자동 배포

[`deploy/deploy.yml`](./deploy/deploy.yml) 이 `main` 푸시 시 자동 빌드·배포하는 워크플로입니다.
쓰려면 GitHub 웹에서 이 파일을 `.github/workflows/deploy.yml` 로 옮기고,
저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 바꾸세요.

> 이 파일은 자동 푸시되지 않았습니다. 작업에 쓰인 GitHub App 토큰에 `workflows` 권한이 없어
> `.github/workflows/` 경로를 푸시하면 거부되기 때문입니다.

### 다른 호스팅

- **Vercel / Netlify**: Root Directory `projects/school-pick`, Build Command `npm run build`, Output `dist`. 이 경우 `vite.config.ts` 의 `base` 를 `/` 로 바꾸세요.
- 해시 라우팅이라 별도 rewrite 설정은 필요 없습니다.

---

## 7. 다음에 붙이면 좋을 것

- 학교 인증(학교 이메일 도메인 제한)과 학교별 피드 분리
- 급식표에서 급식 후기·별점 남기기, 어제/내일 메뉴 알림
- 알림(댓글·좋아요), 이미지 리사이즈/썸네일, 신고·차단, 무한 스크롤
