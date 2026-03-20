'use server'

import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'

const DATA_FILE = path.join(process.cwd(), 'data', 'product-descriptions.json')
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'product-desc-images')

// 기존 블록 배열 → HTML 변환 (마이그레이션)
function blocksToHtml(blocks: Array<{ type: string; content?: string; src?: string }>): string {
  return blocks
    .map((b) => {
      if (b.type === 'image') return `<img src="${b.src ?? ''}" />`
      if (b.type === 'heading') return `<h2>${b.content ?? ''}</h2>`
      if (b.type === 'text') return `<p>${(b.content ?? '').replace(/\n/g, '<br />')}</p>`
      return ''
    })
    .join('')
}

async function readData(): Promise<Record<string, string>> {
  try {
    const raw = JSON.parse(await readFile(DATA_FILE, 'utf-8')) as Record<string, unknown>
    const result: Record<string, string> = {}
    for (const [id, val] of Object.entries(raw)) {
      if (typeof val === 'string') {
        result[id] = val
      } else if (Array.isArray(val)) {
        result[id] = blocksToHtml(val as Array<{ type: string; content?: string; src?: string }>)
      }
    }
    return result
  } catch {
    return {}
  }
}

async function writeData(data: Record<string, string>) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function getProductDescription(productId: string): Promise<string> {
  const data = await readData()
  return data[productId] ?? ''
}

export async function saveProductDescription(
  productId: string,
  html: string
): Promise<{ success: boolean }> {
  try {
    const data = await readData()
    data[productId] = html
    await writeData(data)
    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function uploadDescriptionImage(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const file = formData.get('image') as File
    const productId = formData.get('productId') as string
    if (!file || !productId) return { success: false, error: '파일 또는 상품 ID가 없습니다.' }

    const bytes = await file.arrayBuffer()
    const dir = path.join(PUBLIC_DIR, productId)
    await mkdir(dir, { recursive: true })
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}.${ext}`
    await writeFile(path.join(dir, filename), Buffer.from(bytes))

    return { success: true, path: `/product-desc-images/${productId}/${filename}` }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
