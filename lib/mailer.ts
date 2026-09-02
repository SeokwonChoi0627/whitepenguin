import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

/** 네이버 SMTP 트랜스포터 (지연 생성 + 재사용) */
let cached: Transporter | null = null

export function getTransporter(): Transporter {
  if (cached) return cached

  const user = process.env.NAVER_USER
  const pass = process.env.NAVER_PASS
  if (!user || !pass) {
    throw new Error('NAVER_USER / NAVER_PASS 환경변수가 설정되지 않았습니다.')
  }

  cached = nodemailer.createTransport({
    host: 'smtp.naver.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  })
  return cached
}

export function mailFrom(label = '화이트펭귄'): string {
  return `"${label}" <${process.env.NAVER_USER}>`
}
