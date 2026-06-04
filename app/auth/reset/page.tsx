'use client'

import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
