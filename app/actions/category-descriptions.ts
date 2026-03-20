'use server'

import { supabase } from '@/lib/supabase'
import { uploadToStorage } from '@/lib/storage'
import { revalidatePath } from 'next/cache'

export async function getCategoryDescription(key: string): Promise<string> {
  const { data } = await supabase
    .from('category_descriptions')
    .select('content')
    .eq('category_key', key)
    .single()
  return data?.content ?? ''
}

export async function saveCategoryDescription(
  key: string,
  html: string
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('category_descriptions')
      .upsert({ category_key: key, content: html, updated_at: new Date().toISOString() })
    if (error) throw error
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

    const { publicUrl } = await uploadToStorage('category-desc-images', categoryKey, file)
    return { success: true, path: publicUrl }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
