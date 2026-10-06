/**
 * 입금 계좌 정보 — 발주 안내 문구의 단일 원천.
 *
 * 화면(발주 완료 팝업·VIP 발주 완료)과 메일(견적서)이 모두 여기를 참조한다.
 * 계좌가 바뀌면 이 파일만 고치면 된다.
 */

export const BANK_ACCOUNT = {
  bank: '국민은행',
  number: '712401-01-693592',
  holder: '최석원(화이트펭귄)',
} as const

/** 한 줄 표기: "국민은행 712401-01-693592 최석원(화이트펭귄)" */
export const BANK_ACCOUNT_TEXT = `${BANK_ACCOUNT.bank} ${BANK_ACCOUNT.number} ${BANK_ACCOUNT.holder}`

/** 발주가 입금 확인 후 확정된다는 안내 — 화면·메일에서 같은 문구를 쓴다. */
export const DEPOSIT_NOTICE = '입금이 확인되면 발주가 확정됩니다.'

/** 발주 직전 확인 팝업용 짧은 경고 문구. */
export const DEPOSIT_NOTICE_SHORT = '입금을 완료해야 발주가 완료됩니다.'
