// 사업자 정보 — 약관·개인정보처리방침·견적서가 공유하는 단일 출처.
// 바뀌면 여기만 고치면 된다.

export const COMPANY = {
  name: '화이트펭귄',
  representative: '최석원',
  address: '경기도 군포시 산본천로 33',
  phone: '050-6814-0627',
  email: 'swchoi157@naver.com',
  /** 개인정보 보호책임자 */
  privacyOfficer: '최석원',
} as const

/** 약관·방침의 시행일 (내용을 고치면 이 날짜도 갱신할 것) */
export const POLICY_EFFECTIVE_DATE = '2026년 9월 7일'
