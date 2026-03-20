import { supabase } from './supabase'

export async function uploadToStorage(
  bucket: string,
  folder: string,
  file: File
): Promise<{ publicUrl: string; storagePath: string }> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${folder}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, { contentType: file.type })
  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath)

  return { publicUrl, storagePath }
}

export function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl)
    const marker = `/object/public/${bucket}/`
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return null
    return url.pathname.slice(idx + marker.length)
  } catch {
    return null
  }
}
