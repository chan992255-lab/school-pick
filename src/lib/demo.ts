import type {
  AuthResult,
  Backend,
  Comment,
  MediaType,
  NewPostInput,
  Post,
  PostFilter,
  Profile,
  SignUpInput,
} from './types';

/**
 * Supabase 환경변수가 없을 때 쓰이는 브라우저 저장소 기반 데모 백엔드.
 * 실제 서비스가 아니라, 백엔드를 붙이기 전에도 앱 전체 흐름을 확인할 수 있게 해주는 장치다.
 */

const STORAGE_KEY = 'schoolpick.demo.v1';

interface DemoUser {
  id: string;
  email: string;
  password: string;
  profile: Profile;
}

interface DemoPostRow {
  id: string;
  author_id: string;
  kind: 'media' | 'post';
  board: 'daily' | 'meal' | 'qna' | null;
  title: string | null;
  body: string;
  media_url: string | null;
  media_type: MediaType | null;
  tags: string[];
  created_at: string;
}

interface DemoCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface DemoState {
  version: number;
  users: DemoUser[];
  posts: DemoPostRow[];
  comments: DemoCommentRow[];
  likes: { post_id: string; user_id: string }[];
  bookmarks: { post_id: string; user_id: string }[];
  sessionUserId: string | null;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

function profile(
  id: string,
  nickname: string,
  school: string,
  grade: number,
  bio: string | null = null,
  createdAt = hoursAgo(240),
): Profile {
  return {
    id,
    nickname,
    school,
    grade,
    avatar_url: null,
    bio,
    created_at: createdAt,
  };
}

function seed(): DemoState {
  const users: DemoUser[] = [
    { id: 'demo-u1', email: 'seoyeon@demo.kr', password: 'demo1234', profile: profile('demo-u1', '서연', '한빛고등학교', 2, '점심시간만 기다리는 2학년 🍚') },
    { id: 'demo-u2', email: 'junho@demo.kr', password: 'demo1234', profile: profile('demo-u2', '준호', '대성고등학교', 1, '야구부 · 아침마다 러닝') },
    { id: 'demo-u3', email: 'jiwoo@demo.kr', password: 'demo1234', profile: profile('demo-u3', '지우', '해운고등학교', 3, '수능 400일 남음. 같이 공부해요') },
    { id: 'demo-u4', email: 'minseo@demo.kr', password: 'demo1234', profile: profile('demo-u4', '민서', '서림고등학교', 2, '사진 찍는 게 제일 재밌음 📷') },
    { id: 'demo-u5', email: 'haneul@demo.kr', password: 'demo1234', profile: profile('demo-u5', '하늘', '청람고등학교', 1, '밴드부 드럼') },
  ];

  const posts: DemoPostRow[] = [
    {
      id: 'demo-p1',
      author_id: 'demo-u1',
      kind: 'media',
      board: null,
      title: null,
      body: '오늘 급식 돈가스 진짜 미쳤다… 소스 두 번 받아먹은 사람 나뿐인가요',
      media_url: 'https://picsum.photos/seed/schoolpick-meal1/900/1200',
      media_type: 'image',
      tags: ['급식', '일상'],
      created_at: hoursAgo(2),
    },
    {
      id: 'demo-p2',
      author_id: 'demo-u4',
      kind: 'media',
      board: null,
      title: null,
      body: '하교길 하늘이 너무 예뻐서 한 장. 다들 오늘 하루 수고했어요 🌇',
      media_url: 'https://picsum.photos/seed/schoolpick-sky2/900/1200',
      media_type: 'image',
      tags: ['일상'],
      created_at: hoursAgo(5),
    },
    {
      id: 'demo-p3',
      author_id: 'demo-u2',
      kind: 'media',
      board: null,
      title: null,
      body: '체육시간 농구 3점슛 성공한 순간! 연습한 보람 있다 🔥',
      media_url:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      media_type: 'video',
      tags: ['운동', '일상'],
      created_at: hoursAgo(9),
    },
    {
      id: 'demo-p4',
      author_id: 'demo-u5',
      kind: 'media',
      board: null,
      title: null,
      body: '동아리 합주 연습 중. 드럼 소리 크다고 혼났지만 계속 한다 🥁',
      media_url: 'https://picsum.photos/seed/schoolpick-band4/900/1200',
      media_type: 'image',
      tags: ['음악', '동아리'],
      created_at: hoursAgo(14),
    },
    {
      id: 'demo-p5',
      author_id: 'demo-u3',
      kind: 'media',
      board: null,
      title: null,
      body: '새벽 1시의 자습실. 오늘도 3시간 채웠다. 우리 모두 화이팅',
      media_url: 'https://picsum.photos/seed/schoolpick-study5/900/1200',
      media_type: 'image',
      tags: ['공부', '입시'],
      created_at: hoursAgo(20),
    },
    {
      id: 'demo-p6',
      author_id: 'demo-u1',
      kind: 'post',
      board: 'meal',
      title: '이번 주 급식 메뉴 총정리 (월~금)',
      body: '월: 카레라이스 / 미소국\n화: 돈가스 / 유부장국\n수: 비빔밥 / 계란후라이\n목: 치킨마요덮밥\n금: 잔치국수\n\n개인적으로 화요일이 최고였습니다. 목요일은 치킨마요인데 양이 적어서 아쉬웠어요.',
      media_url: 'https://picsum.photos/seed/schoolpick-menu6/900/700',
      media_type: 'image',
      tags: ['급식'],
      created_at: hoursAgo(7),
    },
    {
      id: 'demo-p7',
      author_id: 'demo-u3',
      kind: 'post',
      board: 'qna',
      title: '수학 미적분 질문 있어요 (급함)',
      body: 'lim x→0 (sin3x)/x 값을 구하는데 왜 3이 되는지 모르겠어요.\nsin3x를 3x로 놓고 풀면 된다고 하는데 그게 왜 되는 건지 설명해줄 사람 있나요?',
      media_url: null,
      media_type: null,
      tags: ['공부', '입시'],
      created_at: hoursAgo(3),
    },
    {
      id: 'demo-p8',
      author_id: 'demo-u4',
      kind: 'post',
      board: 'daily',
      title: '학교 축제 준비하는데 아이디어 좀 주세요',
      body: '저희 반에서 축제 때 카페 부스를 하는데, 다른 반들이 다 예쁘게 꾸며서 고민이에요.\n예산 20만원 안에서 손님 많이 오게 하는 방법 있을까요?',
      media_url: null,
      media_type: null,
      tags: ['일상', '동아리'],
      created_at: hoursAgo(11),
    },
    {
      id: 'demo-p9',
      author_id: 'demo-u2',
      kind: 'post',
      board: 'qna',
      title: '1학년 때부터 생기부 관리 어떻게 해야 할까요?',
      body: '이제 고1인데 선배들은 생기부를 1학년 때부터 준비하라고 하더라고요.\n구체적으로 뭘 기록해야 하고, 어떤 활동을 해야 하는지 알려주세요!',
      media_url: null,
      media_type: null,
      tags: ['입시', '진로'],
      created_at: hoursAgo(26),
    },
    {
      id: 'demo-p10',
      author_id: 'demo-u5',
      kind: 'post',
      board: 'meal',
      title: '급식 잔반 줄이는 팁 공유',
      body: '저희 학교는 잔반이 많아서 환경부에서 뭐라고 했대요.\n배식량 조절 신청서를 만들었더니 실제로 30% 줄었습니다. 다른 학교도 해보세요!',
      media_url: null,
      media_type: null,
      tags: ['급식'],
      created_at: hoursAgo(30),
    },
  ];

  const comments: DemoCommentRow[] = [
    { id: 'demo-c1', post_id: 'demo-p1', author_id: 'demo-u3', body: '저도 소스 두 번 받았어요 ㅋㅋㅋ', created_at: hoursAgo(1.5) },
    { id: 'demo-c2', post_id: 'demo-p1', author_id: 'demo-u4', body: '오늘 급식 진짜 성공이었음', created_at: hoursAgo(1) },
    { id: 'demo-c3', post_id: 'demo-p7', author_id: 'demo-u1', body: 'sin3x = 3x로 생각하면 됩니다. x가 0에 가까워질 때 3x도 0에 가까워지니까 sin(3x)/3x → 1 이에요. 그래서 sin3x/x = 3 × 1 = 3!', created_at: hoursAgo(2.5) },
    { id: 'demo-c4', post_id: 'demo-p7', author_id: 'demo-u2', body: '이거 저도 시험에 나왔는데 감사합니다', created_at: hoursAgo(1.2) },
    { id: 'demo-c5', post_id: 'demo-p6', author_id: 'demo-u5', body: '목요일 치킨마요 저희 학교는 양 많아요 ㅠㅠ 부럽다', created_at: hoursAgo(6) },
    { id: 'demo-c6', post_id: 'demo-p8', author_id: 'demo-u1', body: '포토부스 하나 두면 줄 섭니다. 저희는 그렇게 했어요', created_at: hoursAgo(9) },
  ];

  const likes: { post_id: string; user_id: string }[] = [
    { post_id: 'demo-p1', user_id: 'demo-u2' },
    { post_id: 'demo-p1', user_id: 'demo-u3' },
    { post_id: 'demo-p1', user_id: 'demo-u4' },
    { post_id: 'demo-p1', user_id: 'demo-u5' },
    { post_id: 'demo-p2', user_id: 'demo-u1' },
    { post_id: 'demo-p2', user_id: 'demo-u5' },
    { post_id: 'demo-p3', user_id: 'demo-u1' },
    { post_id: 'demo-p3', user_id: 'demo-u4' },
    { post_id: 'demo-p6', user_id: 'demo-u2' },
    { post_id: 'demo-p6', user_id: 'demo-u4' },
    { post_id: 'demo-p7', user_id: 'demo-u1' },
    { post_id: 'demo-p7', user_id: 'demo-u2' },
    { post_id: 'demo-p7', user_id: 'demo-u4' },
  ];

  const bookmarks: { post_id: string; user_id: string }[] = [
    { post_id: 'demo-p7', user_id: 'demo-u2' },
    { post_id: 'demo-p6', user_id: 'demo-u1' },
  ];

  return {
    version: 1,
    users,
    posts,
    comments,
    likes,
    bookmarks,
    sessionUserId: null,
  };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.posts)) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

let state: DemoState = load();
const listeners = new Set<(user: { id: string; email: string } | null) => void>();

function persist(snapshot: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 공간 초과 등: 상태를 되돌리고 사용자에게 알린다.
    state = snapshot;
    throw new Error(
      '데모 모드의 브라우저 저장 공간이 가득 찼어요. Supabase를 연결하면 큰 사진·영상도 저장할 수 있습니다.',
    );
  }
}

function commit(mutate: () => void): void {
  const snapshot: DemoState = JSON.parse(JSON.stringify(state));
  mutate();
  persist(snapshot);
}

function uid(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function currentUser(): DemoUser | null {
  if (!state.sessionUserId) return null;
  return state.users.find((u) => u.id === state.sessionUserId) ?? null;
}

function profileOf(id: string): Profile | null {
  return state.users.find((u) => u.id === id)?.profile ?? null;
}

function toPost(row: DemoPostRow, viewerId?: string | null): Post {
  return {
    ...row,
    author: profileOf(row.author_id),
    like_count: state.likes.filter((l) => l.post_id === row.id).length,
    comment_count: state.comments.filter((c) => c.post_id === row.id).length,
    liked: Boolean(viewerId && state.likes.some((l) => l.post_id === row.id && l.user_id === viewerId)),
    bookmarked: Boolean(
      viewerId && state.bookmarks.some((b) => b.post_id === row.id && b.user_id === viewerId),
    ),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });
}

export const demoBackend: Backend = {
  mode: 'demo',

  async getSession() {
    const user = currentUser();
    return user ? { id: user.id, email: user.email } : null;
  },

  onAuthStateChange(cb) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    if (state.users.some((u) => u.email === email)) {
      throw new Error('이미 가입된 이메일이에요.');
    }
    if (state.users.some((u) => u.profile.nickname === input.nickname)) {
      throw new Error('이미 사용 중인 닉네임이에요.');
    }
    const id = uid('demo-u');
    const newProfile = profile(id, input.nickname, input.school, input.grade, null, new Date().toISOString());
    commit(() => {
      state.users.push({ id, email, password: input.password, profile: newProfile });
      state.sessionUserId = id;
    });
    listeners.forEach((cb) => cb({ id, email }));
    return { user: { id, email }, needsEmailConfirm: false };
  },

  async signIn(email, password) {
    const normalized = normalizeEmail(email);
    const user = state.users.find((u) => u.email === normalized);
    if (!user || user.password !== password) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않아요.');
    }
    commit(() => {
      state.sessionUserId = user.id;
    });
    listeners.forEach((cb) => cb({ id: user.id, email: user.email }));
    return { id: user.id, email: user.email };
  },

  async signOut() {
    commit(() => {
      state.sessionUserId = null;
    });
    listeners.forEach((cb) => cb(null));
  },

  async getProfile(id) {
    return profileOf(id);
  },

  async updateProfile(id, patch) {
    const user = state.users.find((u) => u.id === id);
    if (!user) throw new Error('프로필을 찾을 수 없어요.');
    commit(() => {
      user.profile = { ...user.profile, ...patch };
    });
    return user.profile;
  },

  async listPosts(filter: PostFilter, viewerId?: string | null) {
    let rows = [...state.posts];
    if (filter.kind) rows = rows.filter((p) => p.kind === filter.kind);
    if (filter.board && filter.board !== 'all') rows = rows.filter((p) => p.board === filter.board);
    if (filter.authorId) rows = rows.filter((p) => p.author_id === filter.authorId);
    if (filter.tag) rows = rows.filter((p) => p.tags.includes(filter.tag as string));
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          (p.title ?? '').toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.tags.join(' ').toLowerCase().includes(q),
      );
    }
    if (filter.bookmarkedOnly && viewerId) {
      const saved = new Set(
        state.bookmarks.filter((b) => b.user_id === viewerId).map((b) => b.post_id),
      );
      rows = rows.filter((p) => saved.has(p.id));
    }
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (filter.limit) rows = rows.slice(0, filter.limit);
    return rows.map((row) => toPost(row, viewerId));
  },

  async getPost(id, viewerId) {
    const row = state.posts.find((p) => p.id === id);
    return row ? toPost(row, viewerId) : null;
  },

  async createPost(input: NewPostInput, author: Profile) {
    const row: DemoPostRow = {
      id: uid('demo-p'),
      author_id: author.id,
      kind: input.kind,
      board: input.board ?? null,
      title: input.title ?? null,
      body: input.body,
      media_url: input.media_url ?? null,
      media_type: input.media_type ?? null,
      tags: input.tags ?? [],
      created_at: new Date().toISOString(),
    };
    commit(() => {
      state.posts.unshift(row);
    });
    return toPost(row, author.id);
  },

  async deletePost(id) {
    commit(() => {
      state.posts = state.posts.filter((p) => p.id !== id);
      state.comments = state.comments.filter((c) => c.post_id !== id);
      state.likes = state.likes.filter((l) => l.post_id !== id);
      state.bookmarks = state.bookmarks.filter((b) => b.post_id !== id);
    });
  },

  async listComments(postId): Promise<Comment[]> {
    return state.comments
      .filter((c) => c.post_id === postId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({ ...c, author: profileOf(c.author_id) }));
  },

  async addComment(postId, body, author) {
    const row: DemoCommentRow = {
      id: uid('demo-c'),
      post_id: postId,
      author_id: author.id,
      body,
      created_at: new Date().toISOString(),
    };
    commit(() => {
      state.comments.push(row);
    });
    return { ...row, author };
  },

  async deleteComment(id) {
    commit(() => {
      state.comments = state.comments.filter((c) => c.id !== id);
    });
  },

  async toggleLike(postId, userId) {
    const existing = state.likes.find((l) => l.post_id === postId && l.user_id === userId);
    commit(() => {
      if (existing) {
        state.likes = state.likes.filter((l) => !(l.post_id === postId && l.user_id === userId));
      } else {
        state.likes.push({ post_id: postId, user_id: userId });
      }
    });
    return {
      liked: !existing,
      count: state.likes.filter((l) => l.post_id === postId).length,
    };
  },

  async toggleBookmark(postId, userId) {
    const existing = state.bookmarks.find((b) => b.post_id === postId && b.user_id === userId);
    commit(() => {
      if (existing) {
        state.bookmarks = state.bookmarks.filter(
          (b) => !(b.post_id === postId && b.user_id === userId),
        );
      } else {
        state.bookmarks.push({ post_id: postId, user_id: userId });
      }
    });
    return { bookmarked: !existing };
  },

  async uploadMedia(file: File, _userId: string) {
    const type: MediaType = file.type.startsWith('video') ? 'video' : 'image';
    // 데모 모드: 작은 파일은 데이터 URL로(새로고침 후에도 유지), 큰 파일은 세션 URL로.
    const inlineLimit = type === 'image' ? 1_200_000 : 400_000;
    const url = file.size <= inlineLimit ? await readAsDataURL(file) : URL.createObjectURL(file);
    return { url, type };
  },
};

export function resetDemoData(): void {
  state = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((cb) => cb(null));
}
