import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = ['swchoi157@naver.com', 'dragon0627@naver.com']

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  const { data, error } = await supabase
    .from('qna')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 비공개 처리: 작성자 본인 또는 관리자만 내용 열람 가능
  const masked = data.map((q) => {
    const isOwner = user && (user.email === q.author_email || user.id === q.user_id)
    if (q.is_private && !isOwner && !isAdmin) {
      return { ...q, content: '', answer: '', answer_date: '' }
    }
    return q
  })

  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  const { category, title, content, is_private, guest_name } = await req.json()
  if (!title || !content || !category) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
  }

  let authorName: string
  let authorEmail: string
  let userId: string

  if (session) {
    const user = session.user as any
    authorName = user.companyName || user.name || user.email
    authorEmail = user.email
    userId = user.id || user.email
  } else {
    if (!guest_name?.trim()) {
      return NextResponse.json({ error: '작성자명을 입력해주세요.' }, { status: 400 })
    }
    authorName = guest_name.trim()
    authorEmail = 'guest'
    userId = 'guest'
  }

  const { data, error } = await supabase.from('qna').insert({
    user_id: userId,
    author_name: authorName,
    author_email: authorEmail,
    category,
    title,
    content,
    is_private: !!is_private,
    answered: false,
    answer: '',
    answer_date: '',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
