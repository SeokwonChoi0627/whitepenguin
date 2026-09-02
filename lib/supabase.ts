import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * 서버 전용 Supabase 클라이언트.
 *
 * ⚠️ 클라이언트 컴포넌트에서 import 하지 말 것 — service_role 키가 브라우저 번들에 실린다.
 *    브라우저에서는 lib/supabase-browser.ts (anon 키, 스토리지 업로드 전용)를 쓴다.
 *
 * users / quotes / qna / password_reset_tokens 등은 개인정보와 자격증명을 담고 있어
 * anon 키(브라우저에 공개됨)로는 접근할 수 없도록 RLS 로 잠겨 있다.
 * (docs/migrations/2026-09-02-lock-down-anon-access.sql 참고)
 * 따라서 서버는 service_role 키로 접근해야 한다.
 */
const supabaseUrl = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY!

if (!serviceRoleKey) {
  // 잠금 마이그레이션 적용 전이라면 anon 키로도 동작하므로 즉시 죽이지는 않는다.
  // 적용 후에는 이 경고가 곧 장애를 뜻하므로 로그에서 바로 눈에 띄어야 한다.
  console.warn(
    '[supabase] SUPABASE_SERVICE_ROLE_KEY 가 없어 anon 키로 동작합니다. ' +
    'DB 잠금 마이그레이션이 적용된 환경에서는 조회·저장이 모두 실패합니다.'
  )
}

export const supabase = createClient(supabaseUrl, serviceRoleKey ?? anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
