-- =====================================================================
--  스쿨픽(School Pick) — Supabase 스키마
--  Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--  한 번 실행하면 표(profiles / posts / comments / likes / bookmarks),
--  RLS 정책, 트리거, 'media' 스토리지 버킷이 모두 준비됩니다.
--  여러 번 실행해도 안전하도록 작성되어 있습니다(idempotent).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. profiles — 학생 프로필 (auth.users 와 1:1)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null,
  school      text,
  grade       int check (grade between 1 and 3),
  avatar_url  text,
  bio         text check (char_length(bio) <= 160),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_nickname_len check (char_length(nickname) between 2 and 12)
);

create unique index if not exists profiles_nickname_key on public.profiles (lower(nickname));

-- ---------------------------------------------------------------------
-- 2. posts — 쇼츠(kind='media') + 커뮤니티 글(kind='post')
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  kind        text not null default 'post' check (kind in ('media', 'post')),
  board       text check (board in ('daily', 'meal', 'qna')),
  title       text check (char_length(title) <= 60),
  body        text not null default '' check (char_length(body) <= 2000),
  media_url   text,
  media_type  text check (media_type in ('image', 'video')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- 커뮤니티 글은 반드시 게시판이 있어야 하고, 쇼츠는 게시판이 없다.
  constraint posts_board_matches_kind check (
    (kind = 'post' and board is not null) or (kind = 'media' and board is null)
  )
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_kind_board_idx on public.posts (kind, board, created_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_tags_idx on public.posts using gin (tags);

-- ---------------------------------------------------------------------
-- 3. comments
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---------------------------------------------------------------------
-- 4. likes — (게시물, 사용자) 한 쌍만 허용
-- ---------------------------------------------------------------------
create table if not exists public.likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists likes_user_idx on public.likes (user_id);

-- ---------------------------------------------------------------------
-- 5. bookmarks — 저장한 글
-- ---------------------------------------------------------------------
create table if not exists public.bookmarks (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. updated_at 자동 갱신
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. 회원가입 시 프로필 자동 생성
--    (signUp 의 options.data 에 담긴 nickname / school / grade 사용)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base     text;
  v_nickname text;
begin
  v_base := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''),
    split_part(coalesce(new.email, 'student'), '@', 1),
    '학생'
  );

  v_nickname := v_base;

  -- 닉네임이 이미 사용 중이면 뒤에 짧은 난수를 붙여 중복을 피한다.
  if exists (select 1 from public.profiles p where lower(p.nickname) = lower(v_nickname)) then
    v_nickname := v_base || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (id, nickname, school, grade)
  values (
    new.id,
    v_nickname,
    nullif(btrim(new.raw_user_meta_data ->> 'school'), ''),
    nullif(new.raw_user_meta_data ->> 'grade', '')::int
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 8. Row Level Security
--    · 읽기: 누구나(비로그인 포함) — 학교 커뮤니티를 둘러볼 수 있게
--    · 쓰기/수정/삭제: 본인 것만
-- ---------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.posts     enable row level security;
alter table public.comments  enable row level security;
alter table public.likes     enable row level security;
alter table public.bookmarks enable row level security;

-- profiles
drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- posts
drop policy if exists "posts are readable by everyone" on public.posts;
create policy "posts are readable by everyone"
  on public.posts for select
  using (true);

drop policy if exists "users create their own posts" on public.posts;
create policy "users create their own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "users update their own posts" on public.posts;
create policy "users update their own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "users delete their own posts" on public.posts;
create policy "users delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

-- comments
drop policy if exists "comments are readable by everyone" on public.comments;
create policy "comments are readable by everyone"
  on public.comments for select
  using (true);

drop policy if exists "users create their own comments" on public.comments;
create policy "users create their own comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "users delete their own comments" on public.comments;
create policy "users delete their own comments"
  on public.comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- likes
drop policy if exists "likes are readable by everyone" on public.likes;
create policy "likes are readable by everyone"
  on public.likes for select
  using (true);

drop policy if exists "users create their own likes" on public.likes;
create policy "users create their own likes"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users delete their own likes" on public.likes;
create policy "users delete their own likes"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- bookmarks
drop policy if exists "users read their own bookmarks" on public.bookmarks;
create policy "users read their own bookmarks"
  on public.bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users create their own bookmarks" on public.bookmarks;
create policy "users create their own bookmarks"
  on public.bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users delete their own bookmarks" on public.bookmarks;
create policy "users delete their own bookmarks"
  on public.bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 9. Storage — 'media' 버킷 (사진 · 짧은 영상)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  62914560, -- 60MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media is publicly readable" on storage.objects;
create policy "media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "users upload media to their own folder" on storage.objects;
create policy "users upload media to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update their own media" on storage.objects;
create policy "users update their own media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and owner = auth.uid())
  with check (bucket_id = 'media' and owner = auth.uid());

drop policy if exists "users delete their own media" on storage.objects;
create policy "users delete their own media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and owner = auth.uid());

-- ---------------------------------------------------------------------
-- 10. 권한 (RLS 이전 단계의 테이블 접근 권한)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.posts, public.comments, public.likes
  to anon, authenticated;
grant select, insert, update, delete
  on public.profiles, public.posts, public.comments, public.likes, public.bookmarks
  to authenticated;

-- ---------------------------------------------------------------------
-- 11. (선택) 샘플 데이터
--     실제 사용자로 로그인한 뒤 아래 주석을 풀고 실행하면 예시 글이 들어갑니다.
--     auth.users 에 존재하는 id 여야 하므로, 본인 계정 id 로 바꿔 사용하세요.
-- ---------------------------------------------------------------------
-- insert into public.posts (author_id, kind, board, title, body, tags)
-- values (
--   '<YOUR-USER-UUID>',
--   'post',
--   'meal',
--   '이번 주 급식 메뉴 후기',
--   '화요일 돈가스가 최고였어요. 목요일은 양이 조금 아쉬웠습니다.',
--   array['급식', '일상']
-- );

-- =====================================================================
--  완료! 이제 프로젝트 루트의 .env 에 아래 두 값을 넣고 npm run dev 하세요.
--    VITE_SUPABASE_URL=https://<project-ref>.supabase.co
--    VITE_SUPABASE_ANON_KEY=<anon public key>
-- =====================================================================
