import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const userId = (session.user as any).id
    if (!userId) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('email, name, company_name, phone, business_number, address, address_detail, password_hash')
      .eq('id', userId)
      .single()
    if (error || !user) throw error ?? new Error('user not found')

    return NextResponse.json({
      email: user.email,
      name: user.name ?? '',
      companyName: user.company_name ?? '',
      phone: user.phone ?? '',
      businessNumber: user.business_number ?? '',
      address: user.address ?? '',
      addressDetail: user.address_detail ?? '',
      hasPassword: !!user.password_hash,
    })
  } catch (err) {
    console.error('프로필 조회 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

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

    const body = await req.json()
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined)
    const name = str(body.name)
    const companyName = str(body.companyName)
    const phone = str(body.phone)
    const businessNumber = str(body.businessNumber)
    const address = str(body.address)
    const addressDetail = str(body.addressDetail)

    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
    }
    if (name && name.length > 50) {
      return NextResponse.json({ error: '이름은 50자 이하로 입력해주세요.' }, { status: 400 })
    }
    if (companyName && companyName.length > 100) {
      return NextResponse.json({ error: '회사명은 100자 이하로 입력해주세요.' }, { status: 400 })
    }
    if (phone && !/^[0-9-+\s()]{7,20}$/.test(phone)) {
      return NextResponse.json({ error: '올바른 전화번호 형식이 아닙니다.' }, { status: 400 })
    }
    if (businessNumber && businessNumber.length > 30) {
      return NextResponse.json({ error: '사업자번호는 30자 이하로 입력해주세요.' }, { status: 400 })
    }
    if (address && address.length > 200) {
      return NextResponse.json({ error: '주소는 200자 이하로 입력해주세요.' }, { status: 400 })
    }
    if (addressDetail && addressDetail.length > 100) {
      return NextResponse.json({ error: '상세 주소는 100자 이하로 입력해주세요.' }, { status: 400 })
    }

    const update: Record<string, string | null> = {}
    if (name !== undefined) update.name = name
    if (companyName !== undefined) update.company_name = companyName || null
    if (phone !== undefined) update.phone = phone || null
    if (businessNumber !== undefined) update.business_number = businessNumber || null
    if (address !== undefined) update.address = address || null
    if (addressDetail !== undefined) update.address_detail = addressDetail || null

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 })
    }

    const { error } = await supabase.from('users').update(update).eq('id', userId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('프로필 수정 오류:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
