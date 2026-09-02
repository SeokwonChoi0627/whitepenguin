import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAdminEmail } from '@/lib/admin'
import { RETURN_STATUS_MAP, type ReturnStatus } from '@/lib/returns'
import { RETURN_TABLE } from '@/lib/return-requests'

const MAX_ADMIN_NOTE_LENGTH = 1000

interface StatusUpdate {
  status?: ReturnStatus
  admin_note?: string | null
}

/** 관리자: 반품요청 상태·메모 변경 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as { email?: string } | undefined
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const { status, adminNote } = body as { status?: unknown; adminNote?: unknown }
  const update: StatusUpdate = {}

  if (status !== undefined) {
    if (typeof status !== 'string' || !RETURN_STATUS_MAP[status as ReturnStatus]) {
      return NextResponse.json({ error: '알 수 없는 처리 상태입니다.' }, { status: 400 })
    }
    update.status = status as ReturnStatus
  }
  if (adminNote !== undefined) {
    if (typeof adminNote !== 'string') {
      return NextResponse.json({ error: '메모 형식이 올바르지 않습니다.' }, { status: 400 })
    }
    if (adminNote.length > MAX_ADMIN_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `메모는 ${MAX_ADMIN_NOTE_LENGTH}자 이내로 입력해 주세요.` },
        { status: 400 }
      )
    }
    update.admin_note = adminNote.trim() || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from(RETURN_TABLE)
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    console.error('반품요청 상태 변경 오류:', error)
    return NextResponse.json({ error: '상태 변경에 실패했습니다.' }, { status: 500 })
  }
  return NextResponse.json(data)
}
