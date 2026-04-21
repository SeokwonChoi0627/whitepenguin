import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const userId = (session.user as any).id
    if (!userId) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 400 })
    }

    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' }, { status: 400 })
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: '새 비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single()

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.' },
        { status: 400 }
      )
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash)
    if (!matches) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('비밀번호 변경 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
