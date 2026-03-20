'use server'

import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'

const DATA_FILE = path.join(process.cwd(), 'data', 'category-descriptions.json')
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'category-desc-images')

async function readData(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf-8')) as Record<string, string>
  } catch {
    return {}
  }
}

async function writeData(data: Record<string, string>) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

export async function getCategoryDescription(key: string): Promise<string> {
  const data = await readData()
  return data[key] ?? ''
}

export async function saveCategoryDescription(
  key: string,
  html: string
): Promise<{ success: boolean }> {
  try {
    const data = await readData()
    data[key] = html
    await writeData(data)
    revalidatePath(`/category/${key}`)
    revalidatePath(`/admin/categories/${key}`)
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function uploadCategoryDescriptionImage(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const file = formData.get('image') as File
    const categoryKey = formData.get('productId') as string
    if (!file || !categoryKey) return { success: false, error: '파일 또는 카테고리 키가 없습니다.' }

    const bytes = await file.arrayBuffer()
    const dir = path.join(PUBLIC_DIR, categoryKey)
    await mkdir(dir, { recursive: true })
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}.${ext}`
    await writeFile(path.join(dir, filename), Buffer.from(bytes))

    return { success: true, path: `/category-desc-images/${categoryKey}/${filename}` }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
