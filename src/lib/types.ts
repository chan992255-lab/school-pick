export type PostKind = 'media' | 'post';
export type Board = 'daily' | 'meal' | 'qna';
export type MediaType = 'image' | 'video';

export interface Profile {
  id: string;
  nickname: string;
  school: string | null;
  grade: number | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  kind: PostKind;
  board: Board | null;
  title: string | null;
  body: string;
  media_url: string | null;
  media_type: MediaType | null;
  tags: string[];
  created_at: string;
  author: Profile | null;
  like_count: number;
  comment_count: number;
  liked: boolean;
  bookmarked: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Profile | null;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface NewPostInput {
  kind: PostKind;
  board?: Board | null;
  title?: string | null;
  body: string;
  media_url?: string | null;
  media_type?: MediaType | null;
  tags?: string[];
}

export interface SignUpInput {
  email: string;
  password: string;
  nickname: string;
  school: string;
  grade: number;
}

export interface PostFilter {
  kind?: PostKind;
  board?: Board | 'all';
  tag?: string | null;
  search?: string;
  authorId?: string;
  bookmarkedOnly?: boolean;
  limit?: number;
}

export interface AuthResult {
  user: AuthUser | null;
  needsEmailConfirm: boolean;
}

/**
 * 하나의 데이터 계층 인터페이스.
 * Supabase가 설정되어 있으면 실제 백엔드가, 없으면 브라우저 저장소 기반 데모 백엔드가 붙는다.
 */
export interface Backend {
  readonly mode: 'supabase' | 'demo';
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(cb: (user: AuthUser | null) => void): () => void;
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getProfile(id: string): Promise<Profile | null>;
  updateProfile(id: string, patch: Partial<Pick<Profile, 'nickname' | 'school' | 'grade' | 'bio' | 'avatar_url'>>): Promise<Profile>;
  listPosts(filter: PostFilter, viewerId?: string | null): Promise<Post[]>;
  getPost(id: string, viewerId?: string | null): Promise<Post | null>;
  createPost(input: NewPostInput, author: Profile): Promise<Post>;
  deletePost(id: string): Promise<void>;
  listComments(postId: string): Promise<Comment[]>;
  addComment(postId: string, body: string, author: Profile): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  toggleLike(postId: string, userId: string): Promise<{ liked: boolean; count: number }>;
  toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }>;
  uploadMedia(file: File, userId: string): Promise<{ url: string; type: MediaType }>;
}

export const BOARDS: {
  id: Board;
  label: string;
  short: string;
  emoji: string;
  description: string;
}[] = [
  { id: 'daily', label: '일상/자유', short: '일상', emoji: '💬', description: '학교 생활, 오늘 있었던 일' },
  { id: 'meal', label: '급식', short: '급식', emoji: '🍚', description: '오늘의 급식 리뷰와 메뉴 이야기' },
  { id: 'qna', label: '공부/질문', short: '공부', emoji: '📚', description: '모르는 문제, 공부법, 입시 질문' },
];

export const BOARD_LABEL: Record<Board, string> = {
  daily: '일상/자유',
  meal: '급식',
  qna: '공부/질문',
};

export const TAGS = ['급식', '공부', '일상', '입시', '동아리', '운동', '음악', '게임', '진로'];
