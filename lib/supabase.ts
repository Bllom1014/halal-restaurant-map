import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // 禁止 Next.js 缓存 fetch，确保每次请求都拿最新数据
        fetch: (url: any, options: any) => fetch(url, { ...options, cache: 'no-store' })
      }
    }
  );
}
