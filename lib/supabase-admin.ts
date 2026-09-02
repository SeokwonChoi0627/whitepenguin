import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * service_role 키를 쓰는 서버 전용 Supabase 클라이언트.
 *
 * 반품요청처럼 환급계좌가 들어가는 민감 테이블은 RLS 로 anon 접근을 막아두므로
 * (docs/migrations/2026-09-02-return-requests.sql 참고) 이 클라이언트로만 읽고 쓴다.
 * 절대 클라이언트 컴포넌트에서 import 하지 말 것.
 */
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. ' +
      'Supabase Dashboard → Project Settings → API → service_role 키를 .env.local 에 추가하세요.'
    )
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
