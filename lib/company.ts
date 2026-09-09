// 사업자 정보 — 푸터·약관·개인정보처리방침이 공유하는 단일 출처.
//
// 전자상거래법 제10조에 따라 아래 항목은 사이트에서 확인 가능해야 한다.
// 상호, 대표자명, 영업소 소재지, 연락처, 사업자등록번호, 통신판매업 신고번호.
// (네이버 로그인 검수에서도 같은 항목을 요구한다)

export const COMPANY = {
  name: '화이트펭귄',
  representative: '최석원',
  /**
   * 공개 표시용 사업장 소재지.
   * 사업자등록증에는 동·호수까지 있으나, 자택 겸용 주소라 건물번호까지만 표시한다.
   * 전자상거래법상 요구되는 소재지 식별은 도로명 + 건물번호로 충족된다.
   */
  address: '경기도 성남시 분당구 내정로 55',
  phone: '050-6814-0627',
  email: 'dragon0627@naver.com',
  businessNumber: '345-22-01035',
  mailOrderNumber: '2020-성남분당A-0251',
  smartStoreUrl: 'https://smartstore.naver.com/whitepenguin',
  /** 개인정보 보호책임자 */
  privacyOfficer: '최석원',
} as const

/** 푸터에 한 줄씩 표시할 법정 고지 항목 */
export const COMPANY_DISCLOSURES: readonly { label: string; value: string }[] = [
  { label: '상호', value: COMPANY.name },
  { label: '대표자', value: COMPANY.representative },
  { label: '사업장 소재지', value: COMPANY.address },
  { label: '사업자등록번호', value: COMPANY.businessNumber },
  { label: '통신판매업신고번호', value: COMPANY.mailOrderNumber },
  { label: '연락처', value: COMPANY.phone },
  { label: '이메일', value: COMPANY.email },
] as const

/** 약관·방침의 시행일 (내용을 고치면 이 날짜도 갱신할 것) */
export const POLICY_EFFECTIVE_DATE = '2026년 9월 7일'
