'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { uploadProductImage, deleteProductImage } from '@/app/actions/images'
import { uploadProductThumbnail } from '@/app/actions/thumbnails'
import { Upload, X, Loader2, ExternalLink, ChevronLeft, RefreshCw } from 'lucide-react'

interface Props {
  product: Product
  initialThumbnail: string | null // override thumbnail (null = 원본 사용 중)
  initialImages: string[]
}

export default function AdminImageManager({ product, initialThumbnail, initialImages }: Props) {
  const [thumbnail, setThumbnail] = useState<string | null>(initialThumbnail)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [images, setImages] = useState(initialImages)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayThumbnail = thumbnail ?? product.image

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumb(true)
    const fd = new FormData()
    fd.append('image', file)
    fd.append('productId', product.id)
    const result = await uploadProductThumbnail(fd)
    if (result.success && result.path) setThumbnail(result.path)
    setUploadingThumb(false)
    e.target.value = ''
  }

  const handleFiles = async (files: FileList) => {
    setUploading(true)
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const fd = new FormData()
      fd.append('image', file)
      fd.append('productId', product.id)
      const result = await uploadProductImage(fd)
      if (result.success && result.path) setImages((prev) => [...prev, result.path!])
    }
    setUploading(false)
  }

  const handleDelete = async (imagePath: string) => {
    setDeleting(imagePath)
    const result = await deleteProductImage(product.id, imagePath)
    if (result.success) setImages((prev) => prev.filter((p) => p !== imagePath))
    setDeleting(null)
  }

  return (
    <div className="space-y-5">
      {/* ── 대표 썸네일 ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[#333333]">대표 썸네일</h2>
            <p className="text-xs text-gray-400 mt-0.5">상품 목록 카드 및 상세 페이지 첫 번째 이미지</p>
          </div>
          {thumbnail && (
            <span className="text-[10px] bg-[#C4A882] text-white px-2 py-0.5 rounded-full font-medium">
              교체됨
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          {/* 썸네일 미리보기 */}
          <div
            className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative group cursor-pointer"
            style={{ backgroundColor: displayThumbnail ? '#f8f5f0' : (product.imageColor || '#F7F3EE') }}
            onClick={() => thumbInputRef.current?.click()}
          >
            {displayThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayThumbnail} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl opacity-30">🍞</span>
            )}
            {/* 호버 오버레이 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              {uploadingThumb ? (
                <Loader2 size={20} className="text-white animate-spin" />
              ) : (
                <RefreshCw size={20} className="text-white" />
              )}
            </div>
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-[#333333] mb-1">{product.name}</p>
            <p className="text-xs text-gray-400 mb-3">
              {thumbnail ? '커스텀 썸네일이 적용되어 있습니다.' : '원본 이미지를 사용 중입니다.'}
            </p>
            <button
              onClick={() => thumbInputRef.current?.click()}
              disabled={uploadingThumb}
              className="flex items-center gap-2 bg-[#333333] hover:bg-[#1a1a1a] disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {uploadingThumb ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {uploadingThumb ? '업로드 중...' : '썸네일 교체'}
            </button>
          </div>
        </div>

        <input
          ref={thumbInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleThumbnailUpload}
        />
      </div>

      {/* ── 추가 이미지 ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-[#333333]">추가 이미지</h2>
            <p className="text-xs text-gray-400 mt-0.5">상세 페이지 캐러셀에 표시됩니다.</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-[#C4A882] hover:bg-[#A08860] disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Upload size={14} />
            이미지 추가
          </button>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
            {images.map((img) => (
              <div key={img} className="relative group aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                <button
                  onClick={() => handleDelete(img)}
                  disabled={deleting === img}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                >
                  {deleting === img ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-5">추가된 이미지가 없습니다.</p>
        )}

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault(); setDragOver(false)
            if (e.dataTransfer.files.length > 0) await handleFiles(e.dataTransfer.files)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-[#C4A882] bg-[#F7F3EE]' : 'border-gray-200 hover:border-[#C4A882] hover:bg-[#F7F3EE]'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-[#C4A882]">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm font-medium">업로드 중...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload size={28} />
              <p className="text-sm">클릭하거나 이미지를 드래그해서 업로드</p>
              <p className="text-xs">JPG, PNG, WEBP · 여러 장 동시 업로드 가능</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }}
        />
      </div>

      {/* 바로가기 */}
      <div className="flex justify-between items-center px-1">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-[#333333] transition-colors flex items-center gap-1">
          <ChevronLeft size={14} />
          목록으로
        </Link>
        <a href={`/product/${product.id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-[#C4A882] hover:text-[#A08860] transition-colors">
          <ExternalLink size={14} />
          상품 페이지에서 확인
        </a>
      </div>
    </div>
  )
}
