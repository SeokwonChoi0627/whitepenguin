// 클라이언트 사이드 이미지 압축/리사이즈 유틸
// 업로드 전 큰 사진을 자동으로 줄여 Supabase 저장공간과 전송량을 아낍니다.

export interface CompressOptions {
  /** 가장 긴 변의 최대 픽셀 (기본 1600px) */
  maxDimension?: number
  /** JPEG 품질 0~1 (기본 0.8) */
  quality?: number
}

const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_QUALITY = 0.8
const SKIP_UNDER_BYTES = 300 * 1024 // 300KB 미만이고 이미 작으면 원본 유지

/**
 * 이미지 파일을 리사이즈 + JPEG 재인코딩해 용량을 줄인다.
 * 압축이 불가능하거나 오히려 커지는 경우 원본을 그대로 반환한다.
 */
export async function compressImage(
  file: File,
  { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY }: CompressOptions = {},
): Promise<File> {
  // 애니메이션 GIF는 압축 시 첫 프레임만 남으므로, 이미지가 아니면 원본 유지
  if (file.type === 'image/gif' || !file.type.startsWith('image/')) {
    return file
  }

  try {
    const dataUrl = await readAsDataURL(file)
    const img = await loadImage(dataUrl)
    const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxDimension)

    // 이미 충분히 작고 용량도 작으면 원본 유지
    if (
      width === img.naturalWidth &&
      height === img.naturalHeight &&
      file.size < SKIP_UNDER_BYTES
    ) {
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    // 투명 배경(PNG)이 JPEG 변환 시 검게 나오지 않도록 흰색으로 채운다
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, quality)
    // 압축 실패하거나 오히려 커졌으면 원본 유지
    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    // 어떤 이유로든 실패하면 원본 업로드로 폴백
    return file
  }
}

function scaleToFit(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w > h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}
