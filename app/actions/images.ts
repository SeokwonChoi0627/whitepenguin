'use server'

import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'

const DATA_FILE = path.join(process.cwd(), 'data', 'product-images.json')
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'product-images')

async function readImageData(): Promise<Record<string, string[]>> {
  try {
    const content = await readFile(DATA_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

async function writeImageData(data: Record<string, string[]>) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function getProductImages(productId: string): Promise<string[]> {
  const data = await readImageData()
  return data[productId] || []
}

export async function getAllProductImages(): Promise<Record<string, string[]>> {
  return readImageData()
}

export async function uploadProductImage(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const file = formData.get('image') as File
    const productId = formData.get('productId') as string

    if (!file || !productId) return { success: false, error: '파일 또는 상품 ID가 없습니다.' }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const dir = path.join(PUBLIC_DIR, productId)
    await mkdir(dir, { recursive: true })

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${Date.now()}.${ext}`
    const filepath = path.join(dir, filename)
    await writeFile(filepath, buffer)

    const webPath = `/product-images/${productId}/${filename}`

    const data = await readImageData()
    if (!data[productId]) data[productId] = []
    data[productId].push(webPath)
    await writeImageData(data)

    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)

    return { success: true, path: webPath }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function deleteProductImage(
  productId: string,
  imagePath: string
): Promise<{ success: boolean }> {
  try {
    const data = await readImageData()
    if (data[productId]) {
      data[productId] = data[productId].filter((p) => p !== imagePath)
      await writeImageData(data)
    }

    // product-images 폴더의 파일만 삭제 (product-details는 수동 관리)
    if (imagePath.startsWith('/product-images/')) {
      const filename = path.basename(imagePath)
      const filepath = path.join(PUBLIC_DIR, productId, filename)
      if (existsSync(filepath)) await unlink(filepath)
    }

    revalidatePath(`/product/${productId}`)
    revalidatePath(`/admin/products/${productId}`)

    return { success: true }
  } catch {
    return { success: false }
  }
}
