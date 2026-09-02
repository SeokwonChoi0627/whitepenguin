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
 * 대표 관리자 주소는 항상 포함한다. ADMIN_EMAIL 환경변수만 믿으면
 * 그 값이 비었거나 오타이거나 다른 주소일 때 알림이 조용히 사라진다
 * (실제로 반품 알림이 도착하지 않는 문제가 있었다).
 * 발주서 메일이 대표 주소로 하드코딩돼 있는 것과도 동작을 맞춘다.
 */
export function adminNotifyAddresses(): string[] {
  const envAddress = process.env.ADMIN_EMAIL?.trim()
  const addresses = [ADMIN_EMAILS[0], ...(envAddress ? [envAddress] : [])]
  return Array.from(new Set(addresses.map((a) => a.toLowerCase())))
}
