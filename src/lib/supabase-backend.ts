import { supabase } from './supabase';
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

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function client() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');
  return supabase;
}

function toPost(row: Row): Post {
  const likeCount = Array.isArray(row.likes) ? Number(row.likes[0]?.count ?? 0) : 0;
  const commentCount = Array.isArray(row.comments) ? Number(row.comments[0]?.count ?? 0) : 0;
  return {
    id: row.id,
    author_id: row.author_id,
    kind: row.kind,
    board: row.board ?? null,
    title: row.title ?? null,
    body: row.body ?? '',
    media_url: row.media_url ?? null,
    media_type: row.media_type ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at,
    author: (row.author as Profile | null) ?? null,
    like_count: likeCount,
    comment_count: commentCount,
    liked: false,
    bookmarked: false,
  };
}

const POST_SELECT = '*, author:profiles!posts_author_id_fkey(*), comments(count), likes(count)';

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return '이메일 또는 비밀번호가 올바르지 않아요.';
  if (/email not confirmed/i.test(message)) return '이메일 인증이 아직 완료되지 않았어요. 메일함을 확인해 주세요.';
  if (/already registered|already been registered/i.test(message)) return '이미 가입된 이메일이에요.';
  if (/at least 6 characters/i.test(message)) return '비밀번호는 6자 이상이어야 해요.';
  return message;
}

function friendlyDbError(message: string): string {
  if (/duplicate key/i.test(message) && /nickname/i.test(message)) return '이미 사용 중인 닉네임이에요.';
  if (/Could not find the table|schema cache|relation .* does not exist/i.test(message))
    return 'Supabase 테이블이 아직 없습니다. supabase/schema.sql을 SQL Editor에서 실행해 주세요.';
  if (/bucket/i.test(message) && /not found/i.test(message))
    return "Storage에 'media' 버킷이 없습니다. supabase/schema.sql을 실행해 주세요.";
  return message;
}

async function attachViewerState(posts: Post[], viewerId: string): Promise<Post[]> {
  if (posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);
  const sb = client();
  const [likesRes, bookmarksRes] = await Promise.all([
    sb.from('likes').select('post_id').eq('user_id', viewerId).in('post_id', ids),
    sb.from('bookmarks').select('post_id').eq('user_id', viewerId).in('post_id', ids),
  ]);
  const liked = new Set((likesRes.data ?? []).map((r: Row) => r.post_id as string));
  const saved = new Set((bookmarksRes.data ?? []).map((r: Row) => r.post_id as string));
  return posts.map((p) => ({ ...p, liked: liked.has(p.id), bookmarked: saved.has(p.id) }));
}

export const supabaseBackend: Backend = {
  mode: 'supabase',

  async getSession() {
    const { data } = await client().auth.getSession();
    const user = data.session?.user;
    return user ? { id: user.id, email: user.email ?? '' } : null;
  },

  onAuthStateChange(cb) {
    const { data } = client().auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      cb(user ? { id: user.id, email: user.email ?? '' } : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const sb = client();
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;
    const { data, error } = await sb.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          nickname: input.nickname,
          school: input.school,
          grade: input.grade,
        },
      },
    });
    if (error) throw new Error(friendlyAuthError(error.message));

    const user = data.user;
    if (data.session && user) {
      // schema.sql의 트리거가 프로필을 만들지만, 트리거가 없어도 동작하도록 한 번 더 upsert.
      const { error: profileError } = await sb.from('profiles').upsert(
        {
          id: user.id,
          nickname: input.nickname,
          school: input.school,
          grade: input.grade,
        },
        { onConflict: 'id' },
      );
      if (profileError) throw new Error(friendlyDbError(profileError.message));
    }

    return {
      user: user ? { id: user.id, email: user.email ?? '' } : null,
      needsEmailConfirm: !data.session,
    };
  },

  async signIn(email, password) {
    const { data, error } = await client().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    if (!data.user) throw new Error('로그인에 실패했어요.');
    return { id: data.user.id, email: data.user.email ?? '' };
  },

  async signOut() {
    const { error } = await client().auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getProfile(id) {
    const { data, error } = await client()
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (/PGRST116/.test(error.code ?? '')) return null;
      throw new Error(friendlyDbError(error.message));
    }
    return (data as Profile | null) ?? null;
  },

  async updateProfile(id, patch) {
    const { data, error } = await client()
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(friendlyDbError(error.message));
    return data as Profile;
  },

  async listPosts(filter: PostFilter, viewerId?: string | null) {
    const sb = client();
    let query = sb
      .from('posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(filter.limit ?? 100);

    if (filter.kind) query = query.eq('kind', filter.kind);
    if (filter.board && filter.board !== 'all') query = query.eq('board', filter.board);
    if (filter.authorId) query = query.eq('author_id', filter.authorId);
    if (filter.tag) query = query.contains('tags', [filter.tag]);
    if (filter.search && filter.search.trim()) {
      const safe = filter.search.trim().replace(/[%,()]/g, ' ').trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
    }

    if (filter.bookmarkedOnly) {
      if (!viewerId) return [];
      const { data: marks, error: markError } = await sb
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', viewerId);
      if (markError) throw new Error(friendlyDbError(markError.message));
      const ids = (marks ?? []).map((r: Row) => r.post_id as string);
      if (ids.length === 0) return [];
      query = query.in('id', ids);
    }

    const { data, error } = await query;
    if (error) throw new Error(friendlyDbError(error.message));

    let posts = ((data ?? []) as Row[]).map(toPost);
    if (viewerId) posts = await attachViewerState(posts, viewerId);
    return posts;
  },

  async getPost(id, viewerId) {
    const { data, error } = await client()
      .from('posts')
      .select(POST_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(friendlyDbError(error.message));
    if (!data) return null;
    const post = toPost(data as Row);
    if (viewerId) {
      const [withState] = await attachViewerState([post], viewerId);
      return withState;
    }
    return post;
  },

  async createPost(input: NewPostInput, author: Profile) {
    const payload = {
      author_id: author.id,
      kind: input.kind,
      board: input.board ?? null,
      title: input.title ?? null,
      body: input.body,
      media_url: input.media_url ?? null,
      media_type: input.media_type ?? null,
      tags: input.tags ?? [],
    };
    const { data, error } = await client()
      .from('posts')
      .insert(payload)
      .select(POST_SELECT)
      .single();
    if (error) throw new Error(friendlyDbError(error.message));
    return toPost(data as Row);
  },

  async deletePost(id) {
    const { error } = await client().from('posts').delete().eq('id', id);
    if (error) throw new Error(friendlyDbError(error.message));
  },

  async listComments(postId): Promise<Comment[]> {
    const { data, error } = await client()
      .from('comments')
      .select('*, author:profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(friendlyDbError(error.message));
    return (data ?? []) as Comment[];
  },

  async addComment(postId, body, author) {
    const { data, error } = await client()
      .from('comments')
      .insert({ post_id: postId, author_id: author.id, body })
      .select('*, author:profiles(*)')
      .single();
    if (error) throw new Error(friendlyDbError(error.message));
    return data as Comment;
  },

  async deleteComment(id) {
    const { error } = await client().from('comments').delete().eq('id', id);
    if (error) throw new Error(friendlyDbError(error.message));
  },

  async toggleLike(postId, userId) {
    const sb = client();
    const { data: existing, error: findError } = await sb
      .from('likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    if (findError) throw new Error(friendlyDbError(findError.message));

    if (existing) {
      const { error } = await sb.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
      if (error) throw new Error(friendlyDbError(error.message));
    } else {
      const { error } = await sb.from('likes').insert({ post_id: postId, user_id: userId });
      if (error) throw new Error(friendlyDbError(error.message));
    }

    const { count, error: countError } = await sb
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    if (countError) throw new Error(friendlyDbError(countError.message));

    return { liked: !existing, count: count ?? 0 };
  },

  async toggleBookmark(postId, userId) {
    const sb = client();
    const { data: existing, error: findError } = await sb
      .from('bookmarks')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    if (findError) throw new Error(friendlyDbError(findError.message));

    if (existing) {
      const { error } = await sb
        .from('bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (error) throw new Error(friendlyDbError(error.message));
      return { bookmarked: false };
    }

    const { error } = await sb.from('bookmarks').insert({ post_id: postId, user_id: userId });
    if (error) throw new Error(friendlyDbError(error.message));
    return { bookmarked: true };
  },

  async uploadMedia(file: File, userId: string): Promise<{ url: string; type: MediaType }> {
    const sb = client();
    const type: MediaType = file.type.startsWith('video') ? 'video' : 'image';
    const extFromName = file.name.includes('.') ? file.name.split('.').pop() : undefined;
    const ext =
      extFromName && extFromName.length <= 5
        ? extFromName.toLowerCase()
        : type === 'video'
          ? 'mp4'
          : 'jpg';
    const randomId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const path = `${userId}/${Date.now()}-${randomId}.${ext}`;

    const { error } = await sb.storage.from('media').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw new Error(friendlyDbError(error.message));

    const { data } = sb.storage.from('media').getPublicUrl(path);
    return { url: data.publicUrl, type };
  },
};
