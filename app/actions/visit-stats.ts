'use server'

import { supabase } from '@/lib/supabase'

export interface VisitStats {
  today: number
  total: number
}

// KST(UTC+9) 기준 오늘 날짜 (YYYY-MM-DD)
function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function getVisitStats(): Promise<VisitStats> {
  try {
    const { data, error } = await supabase
      .from('visit_daily')
      .select('date, count')
    if (error) throw error

    const rows = data ?? []
    const today = todayKST()
    let todayCount = 0
    let total = 0
    for (const row of rows) {
      total += row.count
      if (row.date === today) todayCount = row.count
    }
    return { today: todayCount, total }
  } catch {
    return { today: 0, total: 0 }
  }
}
