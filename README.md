# 스쿨픽 (School Pick)

> 고등학생을 위한 **짧은 영상·사진 공유(쇼츠)** 와 **일상 · 급식 · 공부 질문 커뮤니티**를 하나로 합친 모바일 퍼스트 웹앱입니다.

React + TypeScript + Vite + Tailwind CSS 로 만들었고, 백엔드는 **Supabase**(인증 · Postgres · Storage)를 사용합니다.
Supabase 키를 아직 넣지 않아도 앱은 **데모 모드**로 바로 실행되며, 모든 화면과 상호작용을 그대로 확인할 수 있습니다.

---

## 1. 주요 기능

### 쇼츠 · 미디어 피드
- 세로 스크롤 스냅(모바일) / 카드 그리드(데스크톱) 피드
- 사진과 짧은 영상 업로드 (Supabase Storage `media` 버킷)
- 좋아요 · 댓글 · 저장(북마크), 태그 필터(`#급식 #공부 #일상 #입시 #동아리 #운동 #음악 #게임 #진로`)
- 작성자 학교 · 학년 표시

### 고등학생 커뮤니티
- 게시판 탭: **전체 / 일상·자유 / 급식 / 공부·질문(Q&A)**
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
   │  ├─ UploadModal.tsx      # 쇼츠 업로드 + 커뮤니티 글쓰기
   │  ├─ PostDetailModal.tsx  # 글 상세 + 댓글
   │  ├─ MediaCard.tsx        # 쇼츠 카드
   │  ├─ PostCard.tsx         # 커뮤니티 글 카드
   │  ├─ MediaBlock.tsx       # 이미지/영상 렌더 + 오류 폴백
   │  ├─ Avatar.tsx / Logo.tsx / EmptyState.tsx / SetupBanner.tsx
   ├─ pages/
   │  ├─ FeedPage.tsx         # 쇼츠 피드
   │  ├─ CommunityPage.tsx    # 게시판 · 검색
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
      └─ format.ts            # 시간/숫자/아바타 유틸
```

---

## 4. 데이터 모델

| 테이블 | 설명 | 주요 컬럼 |
| --- | --- | --- |
| `profiles` | 학생 프로필 (auth.users 1:1) | `id`, `nickname`(유니크), `school`, `grade`(1~3), `bio`, `avatar_url` |
| `posts` | 쇼츠 + 커뮤니티 글 | `kind`(media/post), `board`(daily/meal/qna), `title`, `body`, `media_url`, `media_type`, `tags[]` |
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

## 6. 배포

- **Vercel / Netlify**: 저장소를 연결하고 Root Directory 를 `projects/school-pick` 로 지정, Build Command `npm run build`, Output `dist`.
- 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 를 배포 환경에도 등록하세요.
- 해시 라우팅(`#/shorts`, `#/community/qna`, `#/post/{id}`)을 사용하므로 별도 rewrite 설정이 필요 없습니다.

---

## 7. 다음에 붙이면 좋을 것

- 학교 인증(학교 이메일 도메인 제한)과 학교별 피드 분리
- 급식 API(NEIS) 연동으로 오늘의 급식 자동 표시
- 알림(댓글·좋아요), 이미지 리사이즈/썸네일, 신고·차단, 무한 스크롤
