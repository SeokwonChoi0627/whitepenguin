import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = ['swchoi157@naver.com', 'dragon0627@naver.com']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  const { data, error } = await supabase.from('qna').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const isOwner = user && (user.email === data.author_email || user.id === data.user_id)
  if (data.is_private && !isOwner && !isAdmin) {
    return NextResponse.json({ error: '비공개 문의입니다.' }, { status: 403 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const user = session.user as any
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase.from('qna').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const user = session.user as any

  const { data: qna } = await supabase.from('qna').select('author_email, user_id').eq('id', params.id).single()
  const isOwner = qna && (user.email === qna.author_email || user.id === qna.user_id)
  const isAdmin = ADMIN_EMAILS.includes(user.email)

  if (!isOwner && !isAdmin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const { error } = await supabase.from('qna').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
