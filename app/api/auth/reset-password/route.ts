import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: '필수 항목이 누락됐습니다.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
    }

    const { data: resetToken } = await supabase
      .from('password_reset_tokens')
      .select('email, expires_at, used')
      .eq('token', token)
      .single()

    if (!resetToken) {
      return NextResponse.json({ error: '유효하지 않은 링크입니다.' }, { status: 400 })
    }
    if (resetToken.used) {
      return NextResponse.json({ error: '이미 사용된 링크입니다.' }, { status: 400 })
    }
    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json({ error: '링크가 만료됐습니다. 다시 요청해주세요.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('email', resetToken.email)

    if (updateError) throw updateError

    // 토큰 사용 처리
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('비밀번호 재설정 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
