'use server'

import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'

const DATA_FILE = path.join(process.cwd(), 'data', 'product-thumbnails.json')
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'product-thumbnails-custom')

async function readData(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

async function writeData(data: Record<string, string>) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function getProductThumbnails(): Promise<Record<string, string>> {
  return readData()
}

export async function uploadProductThumbnail(
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

    const webPath = `/product-thumbnails-custom/${productId}/${filename}`

    const data = await readData()
    data[productId] = webPath
    await writeData(data)

    revalidatePath(`/product/${productId}`)
    revalidatePath('/products')
    revalidatePath('/')
    revalidatePath(`/admin/products/${productId}`)
    revalidatePath('/admin')

    return { success: true, path: webPath }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
