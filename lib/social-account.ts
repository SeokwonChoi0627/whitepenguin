import 'server-only'

// 소셜 로그인(네이버·카카오) 계정을 회원 정보와 연결한다.
//
// 소셜 로그인은 "인증"만 해줄 뿐이고, 이 사이트의 회원(users 행)은 별도로 있어야 한다.
// 발주·쿠폰·반품이 모두 users.id 를 기준으로 동작하므로, 회원 행이 없는 상태로
// 로그인시키면 마이페이지·쿠폰·반품이 전부 깨진다. 그래서 여기서 실패하면 로그인을 막는다.

import { supabase } from '@/lib/supabase'

export interface LinkedAccount {
  id: string
  companyName: string | null
  phone: string | null
}

export type LinkResult =
  | { ok: true; user: LinkedAccount }
  | { ok: false; reason: 'no_email' }
  /** DB 오류 코드를 함께 넘긴다 — 로그를 못 보는 환경에서도 화면만으로 원인을 좁힐 수 있도록 */
  | { ok: false; reason: 'create_failed'; code?: string }

/** 이메일로 기존 회원을 찾는다 */
async function findByEmail(email: string): Promise<LinkedAccount | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, company_name, phone')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('회원 조회 오류:', error)
    return null
  }
  if (!data) return null
  const row = data as { id: string; company_name: string | null; phone: string | null }
  return { id: row.id, companyName: row.company_name, phone: row.phone }
}

/**
 * 소셜 계정을 회원과 연결한다. 같은 이메일의 회원이 이미 있으면 그 계정을 쓰고,
 * 없으면 새로 만든다 (= 소셜 회원가입).
 *
 * 이메일로 매칭하므로, 이메일로 먼저 가입한 뒤 같은 이메일의 네이버 계정으로
 * 로그인해도 같은 회원으로 이어진다.
 */
export async function linkSocialAccount(params: {
  email: string | null | undefined
  name: string | null | undefined
}): Promise<LinkResult> {
  const email = params.email?.trim().toLowerCase()

  // 네이버·카카오에서 이메일 제공에 동의하지 않으면 회원을 식별할 수 없다.
  if (!email) return { ok: false, reason: 'no_email' }

  const existing = await findByEmail(email)
  if (existing) return { ok: true, user: existing }

  // 이름을 안 주는 경우가 있어 이메일 앞부분으로 대체한다 (마이페이지에서 수정 가능)
  const name = params.name?.trim() || email.split('@')[0]

  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      name,
      company_name: null,
      phone: null,
      password_hash: null,
    })
    .select('id, company_name, phone')
    .single()

  if (!error && data) {
    const row = data as { id: string; company_name: string | null; phone: string | null }
    return { ok: true, user: { id: row.id, companyName: row.company_name, phone: row.phone } }
  }

  // 동시에 두 번 로그인하면 한쪽 삽입이 실패할 수 있다.
  // 그 사이 다른 요청이 만들어 뒀는지 다시 확인한다.
  const retried = await findByEmail(email)
  if (retried) return { ok: true, user: retried }

  console.error('소셜 회원 생성 실패:', error)
  return { ok: false, reason: 'create_failed', code: error?.code }
}
