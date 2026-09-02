'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle,
  ImagePlus,
  Landmark,
  Minus,
  Package,
  Plus,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { compressImage } from '@/lib/imageCompress'
import {
  BANKS,
  MAX_REASON_DETAIL_LENGTH,
  MAX_RETURN_PHOTOS,
  RETURN_PHOTO_BUCKET,
  RETURN_REASONS,
  RETURN_REASON_MAP,
  itemKey,
  normalizeAccountNumber,
  productLabel,
  validateReturnRequest,
  type ReturnReason,
  type ReturnRequestInput,
} from '@/lib/returns'

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => void
      }) => { open: () => void }
    }
  }
}



export interface ReturnableItem {
  name: string
  size?: string
  orderedQuantity: number
  /** 이미 신청된 수량을 뺀, 지금 신청 가능한 최대 수량 */
  returnableQuantity: number
}

interface ReturnRequestFormProps {
  orderNumber: string
  orderDate: string
  items: ReturnableItem[]
  defaultAddress: string
  defaultHolder: string
}

export default function ReturnRequestForm({
  orderNumber,
  orderDate,
  items,
  defaultAddress,
  defaultHolder,
}: ReturnRequestFormProps) {
  const router = useRouter()
  const addressDetailRef = useRef<HTMLInputElement>(null)

  const [reason, setReason] = useState<ReturnReason | ''>('')
  const [reasonDetail, setReasonDetail] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [refundBank, setRefundBank] = useState('')
  const [refundAccount, setRefundAccount] = useState('')
  const [refundHolder, setRefundHolder] = useState(defaultHolder)
  const [pickupAddress, setPickupAddress] = useState(defaultAddress)
  const [pickupAddressDetail, setPickupAddressDetail] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{ returnNumber: string; mailSent: boolean } | null>(null)

  const selectedReason = reason ? RETURN_REASON_MAP[reason] : null

  const selectedItems = useMemo(
    () =>
      items
        .map((item) => ({ item, quantity: quantities[itemKey(item.name, item.size)] ?? 0 }))
        .filter((entry) => entry.quantity > 0),
    [items, quantities]
  )

  const buildInput = (): ReturnRequestInput => ({
    orderNumber,
    reason: reason as ReturnReason,
    reasonDetail,
    items: selectedItems.map(({ item, quantity }) => ({
      name: item.name,
      size: item.size,
      quantity,
    })),
    refundBank,
    refundAccount,
    refundHolder,
    pickupAddress,
    pickupAddressDetail,
    photos: [],
  })

  const changeQuantity = (item: ReturnableItem, delta: number) => {
    const key = itemKey(item.name, item.size)
    setQuantities((prev) => {
      const next = Math.min(item.returnableQuantity, Math.max(0, (prev[key] ?? 0) + delta))
      return { ...prev, [key]: next }
    })
  }

  const toggleItem = (item: ReturnableItem) => {
    const key = itemKey(item.name, item.size)
    setQuantities((prev) => ({ ...prev, [key]: prev[key] ? 0 : 1 }))
  }

  const addPhotos = (fileList: FileList | null) => {
    const incoming = Array.from(fileList ?? [])
    if (incoming.length === 0) return
    if (photos.length + incoming.length > MAX_RETURN_PHOTOS) {
      setError(`사진은 최대 ${MAX_RETURN_PHOTOS}장까지 첨부할 수 있습니다.`)
      return
    }
    setError('')
    setPhotos((prev) => [...prev, ...incoming])
  }

  const openAddressSearch = () => {
    const doOpen = () => {
      new window.daum.Postcode({
        oncomplete: (data) => {
          setPickupAddress(data.roadAddress || data.jibunAddress)
          setPickupAddressDetail('')
          setTimeout(() => addressDetailRef.current?.focus(), 100)
        },
      }).open()
    }
    if (window.daum?.Postcode) {
      doOpen()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.onload = doOpen
    document.head.appendChild(script)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateReturnRequest(buildInput())
    if (!validation.ok) {
      setError(validation.error ?? '입력값을 확인해 주세요.')
      return
    }
    setError('')
    setShowConfirm(true)
  }

  /** 증빙 사진을 압축해 스토리지에 올리고 public URL 목록을 돌려준다 */
  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = []
    for (const original of photos) {
      const file = await compressImage(original)
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `return_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabaseBrowser.storage
        .from(RETURN_PHOTO_BUCKET)
        .upload(fileName, file, { contentType: file.type })
      if (uploadError) throw new Error('사진 업로드에 실패했습니다: ' + uploadError.message)
      const {
        data: { publicUrl },
      } = supabaseBrowser.storage.from(RETURN_PHOTO_BUCKET).getPublicUrl(fileName)
      urls.push(publicUrl)
    }
    return urls
  }

  const confirmSubmit = async () => {
    setShowConfirm(false)
    setIsSubmitting(true)
    setError('')
    try {
      const photoUrls = await uploadPhotos()
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildInput(), photos: photoUrls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '반품요청에 실패했습니다.')
      setResult({ returnNumber: data.returnNumber, mailSent: data.mailSent !== false })
    } catch (err) {
      setError(err instanceof Error ? err.message : '반품요청 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (result) {
    return <SuccessPanel result={result} onDone={() => { router.push('/mypage'); router.refresh() }} />
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── 주문 정보 ── */}
        <div className="bg-[#333333] text-white rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-white/50">반품 대상 주문</p>
            <p className="font-mono font-bold text-lg leading-tight mt-0.5">#{orderNumber}</p>
          </div>
          <p className="text-xs text-white/60">{orderDate} 발주</p>
        </div>

        {/* ── 1. 반품 상품 ── */}
        <Section icon={<Package size={15} />} step={1} title="반품할 상품 선택">
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const key = itemKey(item.name, item.size)
              const quantity = quantities[key] ?? 0
              const isSoldOut = item.returnableQuantity === 0
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 px-5 py-3.5 ${isSoldOut ? 'opacity-40' : ''}`}
                >
                  <button
                    type="button"
                    disabled={isSoldOut}
                    onClick={() => toggleItem(item)}
                    aria-pressed={quantity > 0}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                      quantity > 0
                        ? 'bg-[#333333] border-[#333333] text-white'
                        : 'border-gray-300 hover:border-[#C4A882]'
                    } ${isSoldOut ? 'cursor-not-allowed' : ''}`}
                  >
                    {quantity > 0 && <CheckCircle size={12} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {productLabel(item.name, item.size)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      발주 {item.orderedQuantity}개
                      {item.returnableQuantity < item.orderedQuantity && (
                        <span className="text-[#C4A882] ml-1.5">
                          · 신청 가능 {item.returnableQuantity}개
                        </span>
                      )}
                    </p>
                  </div>

                  {quantity > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <StepperButton onClick={() => changeQuantity(item, -1)} disabled={quantity <= 0}>
                        <Minus size={13} />
                      </StepperButton>
                      <span className="w-8 text-center text-sm font-bold tabular-nums">{quantity}</span>
                      <StepperButton
                        onClick={() => changeQuantity(item, 1)}
                        disabled={quantity >= item.returnableQuantity}
                      >
                        <Plus size={13} />
                      </StepperButton>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── 2. 반품 사유 ── */}
        <Section icon={<AlertCircle size={15} />} step={2} title="반품 사유">
          <div className="px-5 py-4 space-y-2">
            {RETURN_REASONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  reason === option.value
                    ? 'border-[#C4A882] bg-[#F7F3EE]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="mt-0.5 accent-[#333333]"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-gray-900">{option.label}</span>
                  <span
                    className={`block text-xs mt-0.5 leading-relaxed ${
                      option.customerPaysShipping ? 'text-red-500' : 'text-gray-500'
                    }`}
                  >
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}

            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                상세 사유
                {reason === 'other' ? (
                  <span className="text-red-400 ml-0.5">*</span>
                ) : (
                  <span className="ml-1.5 text-gray-400 font-normal">(선택)</span>
                )}
              </label>
              <textarea
                rows={3}
                maxLength={MAX_REASON_DETAIL_LENGTH}
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder="어떤 문제가 있었는지 구체적으로 적어주시면 처리가 빨라집니다."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
              <p className="text-right text-xs text-gray-300 mt-1">
                {reasonDetail.length} / {MAX_REASON_DETAIL_LENGTH}
              </p>
            </div>
          </div>
        </Section>

        {/* ── 3. 증빙 사진 ── */}
        <Section
          icon={<ImagePlus size={15} />}
          step={3}
          title="증빙 사진"
          hint={selectedReason?.requiresPhoto ? '첨부 권장' : '선택'}
        >
          <div className="px-5 py-4">
            <div className="flex gap-2 flex-wrap">
              {photos.map((file, idx) => (
                <PhotoThumb
                  key={`${file.name}-${idx}`}
                  file={file}
                  onRemove={() => setPhotos(photos.filter((_, i) => i !== idx))}
                />
              ))}
              {photos.length < MAX_RETURN_PHOTOS && (
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#C4A882] hover:bg-[#F7F3EE] text-gray-400 hover:text-[#C4A882] rounded-xl cursor-pointer transition-colors flex-shrink-0">
                  <ImagePlus size={18} />
                  <span className="text-xs mt-1">추가</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addPhotos(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">
              파손·불량·오배송은 사진이 있으면 확인이 빨라집니다. 최대 {MAX_RETURN_PHOTOS}장.
            </p>
          </div>
        </Section>

        {/* ── 4. 환급 계좌 ── */}
        <Section icon={<Landmark size={15} />} step={4} title="환급 계좌" hint="필수">
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  은행<span className="text-red-400 ml-0.5">*</span>
                </label>
                <select
                  value={refundBank}
                  onChange={(e) => setRefundBank(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                >
                  <option value="">선택</option>
                  {BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  계좌번호<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="- 없이 숫자만 입력"
                  value={refundAccount}
                  onChange={(e) => setRefundAccount(normalizeAccountNumber(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                예금주<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                placeholder="홍길동"
                value={refundHolder}
                onChange={(e) => setRefundHolder(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
              />
            </div>
            <p className="text-xs text-gray-500 bg-[#F7F3EE] rounded-lg px-3.5 py-2.5 leading-relaxed">
              계좌 정보가 정확하지 않으면 환급이 지연됩니다. 예금주명은 통장에 등록된 이름과 동일해야 합니다.
            </p>
          </div>
        </Section>

        {/* ── 5. 회수지 ── */}
        <Section icon={<Truck size={15} />} step={5} title="회수지 주소" hint="필수">
          <div className="px-5 py-4">
            <div className="flex gap-2 mb-1.5">
              <input
                type="text"
                readOnly
                value={pickupAddress}
                onClick={openAddressSearch}
                placeholder="주소 검색 버튼을 눌러주세요"
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
              placeholder="상세 주소 (동/호수, 건물명 등)"
              value={pickupAddressDetail}
              onChange={(e) => setPickupAddressDetail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EDE4D8] focus:border-[#C4A882]"
            />
            <p className="text-xs text-gray-400 mt-2">
              기본값은 발주 시 입력하신 배송지입니다. 다른 곳에서 회수해야 하면 변경해 주세요.
            </p>
          </div>
        </Section>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/mypage"
            className="flex-1 text-center border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] bg-[#333333] text-white font-bold py-3 rounded-xl hover:bg-[#1a1a1a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '접수 중...' : '반품요청 접수하기'}
          </button>
        </div>
      </form>

      {showConfirm && (
        <ConfirmModal
          orderNumber={orderNumber}
          reasonLabel={selectedReason?.label ?? ''}
          items={selectedItems.map(({ item, quantity }) => ({
            label: productLabel(item.name, item.size),
            quantity,
          }))}
          bank={refundBank}
          account={refundAccount}
          holder={refundHolder}
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmSubmit}
        />
      )}
    </>
  )
}

// ─── 하위 프레젠테이션 컴포넌트 ────────────────────────────────

function Section({
  icon,
  step,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode
  step: number
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
        <span className="w-6 h-6 rounded-full bg-[#F7F3EE] text-[#C4A882] flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
        <h2 className="font-bold text-sm text-gray-900 flex-1">
          <span className="text-gray-300 mr-1.5">{step}</span>
          {title}
        </h2>
        {hint && (
          <span className="text-xs text-gray-400 font-medium flex-shrink-0">{hint}</span>
        )}
      </header>
      {children}
    </section>
  )
}

function StepperButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#C4A882] hover:text-[#C4A882] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-500"
    >
      {children}
    </button>
  )
}

function PhotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview] = useState(() => URL.createObjectURL(file))

  // 미리보기 blob URL 은 컴포넌트가 사라질 때 반드시 해제한다
  useEffect(() => () => URL.revokeObjectURL(preview), [preview])

  return (
    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="첨부 사진" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="사진 삭제"
        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function ConfirmModal({
  orderNumber,
  reasonLabel,
  items,
  bank,
  account,
  holder,
  onCancel,
  onConfirm,
}: {
  orderNumber: string
  reasonLabel: string
  items: { label: string; quantity: number }[]
  bank: string
  account: string
  holder: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-[#333333] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </span>
            <div>
              <p className="font-bold text-base leading-tight">반품요청 확인</p>
              <p className="text-white/60 text-xs mt-0.5">아래 내용으로 접수할까요?</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="bg-[#F7F3EE] rounded-xl p-4 space-y-2 text-sm">
            <SummaryRow label="주문번호" value={`#${orderNumber}`} mono />
            <SummaryRow label="반품 사유" value={reasonLabel} />
            {items.map((item) => (
              <SummaryRow key={item.label} label={item.label} value={`${item.quantity}개`} />
            ))}
          </div>
          <div className="bg-[#FFF8E7] border border-[#E8D9B5] rounded-xl p-4 space-y-2 text-sm">
            <SummaryRow label="환급 계좌" value={`${bank} ${account}`} mono />
            <SummaryRow label="예금주" value={holder} />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            접수 후에는 화면에서 수정할 수 없습니다. 정정이 필요하면 050-6814-0627 로 연락 주세요.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            다시 확인
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-[#333333] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-[#1a1a1a] transition-colors"
          >
            접수하기
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`font-semibold text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function SuccessPanel({
  result,
  onDone,
}: {
  result: { returnNumber: string; mailSent: boolean }
  onDone: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden text-center">
      <div className="px-6 py-10">
        <div className="w-14 h-14 rounded-full bg-[#F7F3EE] text-[#C4A882] flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={26} />
        </div>
        <h2 className="font-bold text-lg text-gray-900">반품요청이 접수되었습니다</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          반품번호 <span className="font-mono font-bold text-gray-900">{result.returnNumber}</span>
          <br />
          담당자가 확인 후 영업일 기준 1~2일 이내에 회수 일정을 안내드립니다.
        </p>
        {!result.mailSent && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 mt-4 leading-relaxed">
            접수는 정상 완료되었으나 알림 메일 발송에 실패했습니다.
            처리가 지연되면 050-6814-0627 로 문의해 주세요.
          </p>
        )}
      </div>
      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-[#333333] text-white font-bold py-3 rounded-xl hover:bg-[#1a1a1a] transition-colors"
        >
          마이페이지로 돌아가기
        </button>
      </div>
    </div>
  )
}
