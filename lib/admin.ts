/** 관리자 이메일 목록 — 관리자 판별의 단일 출처 */
export const ADMIN_EMAILS = ['swchoi157@naver.com', 'dragon0627@naver.com'] as const

/**
 * 관리자 여부 판별.
 * ADMIN_EMAIL 환경변수와 하드코딩 목록을 모두 인정한다 —
 * middleware(페이지 접근)와 API 라우트가 같은 기준을 쓰도록 하기 위함.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  if (email === process.env.ADMIN_EMAIL) return true
  return (ADMIN_EMAILS as readonly string[]).includes(email)
}

/**
 * 알림 메일 수신 주소 목록.
 *
 * 대표 관리자 주소로만 보낸다 — 발주서 메일(send-quote)과 동일한 수신처.
 * ADMIN_EMAIL 환경변수는 /admin 접근 판별(isAdminEmail)에만 쓰고
 * 알림 수신에는 쓰지 않는다. 운영자가 그 주소로는 받지 않기를 원했다.
 */
export function adminNotifyAddresses(): string[] {
  return [ADMIN_EMAILS[0]]
}
