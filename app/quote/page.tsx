'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { CartItem } from '@/lib/types'
import { Trash2, Plus, Minus, FileText, CheckCircle, Upload, X, Search, AlertCircle, Mail } from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => void
      }) => { open: () => void }
    }
  }
}

const EMPTY_FORM = {
  companyName: '',
  representative: '',
  businessNumber: '',
  phone: '',
  email: '',
  address: '',
  addressDetail: '',
  notes: '',
}

export default function QuotePage() {
  const { status } = useSession()
  const [cart, setCart] = useState<CartItem[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [bizFile, setBizFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addressDetailRef = useRef<HTMLInputElement>(null)

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const openAddressSearch = () => {
    const doOpen = () => {
      new window.daum.Postcode({
        oncomplete: (data) => {
          setForm((prev) => ({ ...prev, address: data.roadAddress || data.jibunAddress }))
          setTimeout(() => addressDetailRef.current?.focus(), 100)
        },
      }).open()
    }
    if (window.daum?.Postcode) {
      doOpen()
    } else {
      const script = document.createElement('script')
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
      script.onload = doOpen
      document.head.appendChild(script)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('quoteCart')
    if (saved) setCart(JSON.parse(saved))
  }, [])

  // 로그인 사용자: 계정 정보를 발주서 폼 기본값으로 로드
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user/profile')
        if (!res.ok) return
        const p = await res.json()
        if (cancelled) return
        setForm((prev) => ({
          companyName: prev.companyName || (p.companyName ?? ''),
          representative: prev.representative || (p.name ?? ''),
          businessNumber: prev.businessNumber || (p.businessNumber ?? ''),
          phone: prev.phone || (p.phone ?? ''),
          email: prev.email || (p.email ?? ''),
          address: prev.address || (p.address ?? ''),
          addressDetail: prev.addressDetail || (p.addressDetail ?? ''),
          notes: prev.notes,
        }))
      } catch {
        // 프로필 로드 실패는 무시 (빈 폼으로 진행)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  const updateCart = (updated: CartItem[]) => {
    setCart(updated)
    localStorage.setItem('quoteCart', JSON.stringify(updated))
  }

  const updateQty = (id: string, delta: number) => {
    const updated = cart
      .map((item) => item.product.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0)
    updateCart(updated)
  }

  const removeItem = (id: string) => {
    updateCart(cart.filter((item) => item.product.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.address) {
      alert('배송지 주소를 입력해 주세요.')
      return
    }
    setShowConfirmModal(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)
    setSubmitError(false)

    const formData = new FormData()
    formData.append('companyName', form.companyName)
    formData.append('representative', form.representative)
    formData.append('phone', form.phone)
    formData.append('email', form.email)
    const fullAddress = form.addressDetail ? `${form.address} ${form.addressDetail}` : form.address
    formData.append('address', fullAddress)
    formData.append('addressBase', form.address)
    formData.append('addressDetail', form.addressDetail)
    formData.append('businessNumber', form.businessNumber)
    formData.append('notes', form.notes)
    formData.append('cart', JSON.stringify(cart))
    if (bizFile) formData.append('bizFile', bizFile)

    try {
      const res = await fetch('/api/send-quote', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('전송 실패')
      updateCart([])
      setShowSuccessModal(true)
    } catch {
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)
  const discountRate = totalQty >= 100 ? 0.15 : totalQty >= 50 ? 0.12 : totalQty >= 10 ? 0.10 : 0
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.priceVatIncluded * item.quantity,
    0
  )
  const discountAmount = Math.round(totalAmount * discountRate)
  const finalTotal = discountAmount > 0
    ? (totalAmount - discountAmount >= 100000
      ? Math.floor((totalAmount - discountAmount) / 1000) * 1000
      : totalAmount - discountAmount)
    : totalAmount

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={24} className="text-[#333333]" />
            발주서 작성
          </h1>
          <p className="text-gray-500 text-sm mt-1">상품을 선택하고 업체 정보를 입력해 주세요.</p>
          <p className="text-gray-500 text-sm mt-1">10개 이상 10%, 50개 이상 12%, 100개 이상 15% 할인 적용</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* 왼쪽: 발주 목록 */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">발주 상품 목록</h2>
                <span className="text-sm text-gray-500">{cart.length}개 품목</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <p className="text-4xl mb-3">🛒</p>
                  <p className="text-sm mb-4">아직 담긴 상품이 없습니다.</p>
                  <Link
                    href="/products"
                    className="inline-block text-[#333333] text-sm font-medium border border-[#333333] px-4 py-2 rounded-lg hover:bg-[#F7F3EE]"
                  >
                    상품 보러 가기
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <div key={item.product.id} className="px-5 py-4 flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: item.product.imageColor || '#f1f5f9' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{item.product.name}</p>
                        {item.product.size && (
                          <p className="text-xs text-gray-500">{item.product.size}</p>
                        )}
                        <p className="text-xs text-[#333333] font-medium mt-0.5">
                          {item.product.priceVatIncluded.toLocaleString()}원
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="text-right w-20 flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {(item.product.priceVatIncluded * item.quantity).toLocaleString()}원
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <div className="px-5 py-4 bg-gray-50 space-y-2">
                    {discountRate > 0 && (
                      <>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>정가 합계</span>
                          <span>{totalAmount.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-red-500 font-semibold">
                          <span>
                            수량 할인 ({discountRate * 100}%↓ · {totalQty}개 이상)
                          </span>
                          <span>- {discountAmount.toLocaleString()}원</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                      <span className="font-semibold text-gray-700">최종 합계 (VAT 포함)</span>
                      <span className="text-xl font-black text-[#333333]">
                        {finalTotal.toLocaleString()}원
                      </span>
                    </div>
                    {discountRate === 0 && totalQty < 10 && totalQty > 0 && (
                      <p className="text-xs text-gray-400 text-right">
                        10개 이상 담으면 10% 할인이 적용됩니다
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 업체 정보 폼 */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">업체 정보</h2>
              </div>
              <div className="px-5 py-5 space-y-4">
                {[
                  { key: 'companyName', label: '업체명', placeholder: '(주)베이커리나라', required: true },
                  { key: 'representative', label: '담당자명', placeholder: '홍길동', required: true },
                  { key: 'phone', label: '연락처', placeholder: '010-0000-0000', required: true },
                  { key: 'email', label: '이메일', placeholder: 'contact@example.com', required: true },
                  { key: 'businessNumber', label: '사업자등록번호', placeholder: '000-00-00000', required: false },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      {field.label}
                      {field.required
                        ? <span className="text-red-400 ml-0.5">*</span>
                        : <span className="ml-1.5 text-gray-400 font-normal">(선택)</span>
                      }
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      required={field.required}
                      value={form[field.key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                    />
                  </div>
                ))}

                {/* 배송지 주소 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    배송지 주소<span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2 mb-1.5">
                    <input
                      type="text"
                      placeholder="주소 검색 버튼을 눌러주세요"
                      required
                      readOnly
                      value={form.address}
                      onClick={openAddressSearch}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                    />
                    <button
                      type="button"
                      onClick={openAddressSearch}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#333333] text-white text-xs font-semibold rounded-lg hover:bg-[#1a1a1a] transition-colors whitespace-nowrap"
                    >
                      <Search size={13} />
                      주소 검색
                    </button>
                  </div>
                  <input
                    ref={addressDetailRef}
                    type="text"
                    placeholder="상세 주소 입력 (동/호수, 건물명 등)"
                    value={form.addressDetail}
                    onChange={(e) => setForm({ ...form, addressDetail: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                  />
                </div>

                {/* 사업자등록증 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    사업자등록증
                    <span className="ml-1.5 text-gray-400 font-normal">(선택)</span>
                  </label>
                  {bizFile ? (
                    <div className="flex items-center gap-2 border border-[#C4A882] bg-[#F7F3EE] rounded-lg px-3 py-2">
                      <FileText size={14} className="text-[#C4A882] flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 truncate">{bizFile.name}</span>
                      <button
                        type="button"
                        onClick={() => { setBizFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2 border border-dashed border-gray-300 hover:border-[#C4A882] hover:bg-[#F7F3EE] rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:text-[#C4A882] transition-colors"
                    >
                      <Upload size={14} />
                      파일 선택 (JPG, PNG, PDF)
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setBizFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    추가 요청사항
                    <span className="ml-1.5 text-gray-400 font-normal">(선택)</span>
                  </label>
                  <textarea
                    placeholder="수량 협의, 특이사항 등 자유롭게 입력하세요"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882] resize-none"
                  />
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  type="submit"
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-full bg-[#333333] text-white font-bold py-3 rounded-xl hover:bg-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '전송 중...' : '발주서 제출하기'}
                </button>
                {cart.length === 0 && !isSubmitting && (
                  <p className="text-xs text-gray-400 text-center mt-2">상품을 먼저 담아주세요.</p>
                )}
                {submitError && (
                  <p className="text-xs text-red-500 text-center mt-2">전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── 확인 팝업 ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* 상단 헤더 */}
            <div className="bg-[#333333] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="font-bold text-base leading-tight">발주서 제출 확인</p>
                  <p className="text-white/60 text-xs mt-0.5">아래 내용으로 발주하시겠습니까?</p>
                </div>
              </div>
            </div>

            {/* 요약 내용 */}
            <div className="px-6 py-5 space-y-3">
              <div className="bg-[#F7F3EE] rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">업체명</span>
                  <span className="font-semibold text-gray-900">{form.companyName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">담당자</span>
                  <span className="font-semibold text-gray-900">{form.representative}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">품목 수</span>
                  <span className="font-semibold text-gray-900">{cart.length}종 / 총 {cart.reduce((s, i) => s + i.quantity, 0)}개</span>
                </div>
                {discountRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">할인 ({discountRate * 100}%)</span>
                    <span className="text-red-500 font-semibold">- {discountAmount.toLocaleString()}원</span>
                  </div>
                )}
                <div className="border-t border-[#E8DDD0] pt-2 flex justify-between text-sm">
                  <span className="text-gray-500">최종 합계금액</span>
                  <span className="font-black text-[#333333] text-base">{finalTotal.toLocaleString()}원</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                제출 후 기재하신 이메일로 견적서가 발송됩니다.
              </p>
            </div>

            {/* 버튼 */}
            <div className="px-6 pb-6 flex gap-2.5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#333333] text-white text-sm font-bold hover:bg-[#1a1a1a] transition-colors"
              >
                예, 제출합니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 완료 팝업 ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* 상단 장식 */}
            <div className="bg-gradient-to-br from-[#C4A882] to-[#a8896a] px-6 pt-8 pb-6 text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-black tracking-tight">발주 완료!</h2>
              <p className="text-white/75 text-sm mt-1">발주서가 성공적으로 접수되었습니다</p>
            </div>

            {/* 내용 */}
            <div className="px-6 py-5">
              <div className="flex items-start gap-3 bg-[#F7F3EE] rounded-xl p-4">
                <Mail size={18} className="text-[#C4A882] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">이메일을 확인해 주세요</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-[#333333]">{form.email}</span>으로<br />
                    견적서가 발송되었습니다.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                급하신 경우 <span className="font-semibold text-gray-600">050-6814-0627</span>로 연락바랍니다.
              </p>
            </div>

            {/* 버튼 */}
            <div className="px-6 pb-6 flex gap-2.5">
              <Link
                href="/mypage"
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                발주 내역 보기
              </Link>
              <Link
                href="/products"
                className="flex-1 py-2.5 rounded-xl bg-[#333333] text-white text-sm font-bold hover:bg-[#1a1a1a] transition-colors text-center"
              >
                상품 더 보기
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
