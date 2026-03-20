import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = ['swchoi157@naver.com', 'dragon0627@naver.com']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const user = session.user as any
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('community_posts')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const user = session.user as any
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  const { error } = await supabase.from('community_posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
