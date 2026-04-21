import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth')

  const userId = (session.user as any).id
  const { data: user } = await supabase
    .from('users')
    .select('email, name, company_name, phone, business_number, address, address_detail, password_hash')
    .eq('id', userId)
    .single()

  if (!user) redirect('/auth')

  return (
    <SettingsClient
      initial={{
        email: user.email,
        name: user.name ?? '',
        companyName: user.company_name ?? '',
        phone: user.phone ?? '',
        businessNumber: user.business_number ?? '',
        address: user.address ?? '',
        addressDetail: user.address_detail ?? '',
        hasPassword: !!user.password_hash,
      }}
    />
  )
}
