import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: '이메일을 입력해주세요.' }, { status: 400 })
    }

    // 가입된 이메일인지 확인 (보안상 결과는 항상 동일하게 응답)
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30) // 30분

      // 기존 미사용 토큰 무효화
      await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('email', email)
        .eq('used', false)

      await supabase.from('password_reset_tokens').insert({
        email,
        token,
        expires_at: expiresAt.toISOString(),
      })

      const baseUrl = process.env.NEXTAUTH_URL || 'https://whitepenguin.co.kr'
      const resetUrl = `${baseUrl}/auth/reset?token=${token}`

      const transporter = nodemailer.createTransport({
        host: 'smtp.naver.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.NAVER_USER,
          pass: process.env.NAVER_PASS,
        },
      })

      await transporter.sendMail({
        from: `"화이트펭귄" <${process.env.NAVER_USER}>`,
        to: email,
        subject: '[화이트펭귄] 비밀번호 재설정 안내',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;">
            <img src="${baseUrl}/logo-auth.png" alt="화이트펭귄" style="height:64px;margin-bottom:24px;" />
            <h2 style="font-size:18px;font-weight:700;color:#111;margin:0 0 8px;">비밀번호 재설정</h2>
            <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
              아래 버튼을 클릭하여 비밀번호를 재설정하세요.<br/>
              링크는 <strong>30분간</strong> 유효합니다.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#333;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
              비밀번호 재설정하기
            </a>
            <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.6;">
              본인이 요청하지 않은 경우 이 메일을 무시하셔도 됩니다.<br/>
              문의: 050-6814-0627
            </p>
          </div>
        `,
      })
    }

    // 이메일 존재 여부 노출 방지: 항상 성공으로 응답
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('비밀번호 재설정 요청 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
