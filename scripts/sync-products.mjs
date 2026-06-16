/**
 * 상품 동기화: 재고 상품총괄표 엑셀 → 홈페이지 lib/products.ts 자동 생성.
 *
 * 단일 원천 = 엑셀(상품명·코드·가격·사이즈·카테고리).
 * 표시 전용 정보(이미지·구수·발송메모·표시명/사이즈 override)는 data/product-presentation.json.
 *
 * 실행: node scripts/sync-products.mjs            (생성)
 *       node scripts/sync-products.mjs --check    (생성 없이 변경점만 출력)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const CHECK_ONLY = process.argv.includes('--check')

const cfg = JSON.parse(readFileSync(join(__dirname, 'sync-config.json'), 'utf-8'))
const presentation = JSON.parse(
  readFileSync(join(root, 'data/product-presentation.json'), 'utf-8'),
)

// ── 1) 최신 마스터 엑셀 찾기 (날짜가 파일명에 포함되므로 mtime 기준 최신) ──
function findLatestMaster() {
  const dir = cfg.masterDir
  const cands = readdirSync(dir)
    .filter(
      (f) =>
        f.startsWith(cfg.masterFilePrefix) &&
        f.toLowerCase().endsWith('.xlsx') &&
        !f.startsWith('~$'),
    )
    .map((f) => ({ f, m: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
  if (cands.length === 0) {
    throw new Error(`마스터 엑셀을 찾을 수 없음: ${dir}/${cfg.masterFilePrefix}*.xlsx`)
  }
  return join(dir, cands[0].f)
}

// ── 2) 엑셀 파싱 → 상품 raw 목록 ──
function readMaster(path) {
  const wb = XLSX.readFile(path)
  const ws = wb.Sheets[cfg.sheetName]
  if (!ws) throw new Error(`시트 없음: ${cfg.sheetName}`)
  const rows = XLSX.utils.sheet_to_json(ws, { range: cfg.headerRowIndex, defval: null })
  const C = cfg.columns
  return rows
    .map((r) => {
      let sku = r[C.sku]
      if (sku == null) return null
      sku = String(sku).trim()
      if (/^\d+$/.test(sku) && sku.length < 5) sku = sku.padStart(5, '0')
      const priceRaw = r[C.price]
      const price =
        priceRaw == null || priceRaw === '' ? 0 : Math.round(Number(priceRaw))
      const sizeRaw = r[C.size]
      return {
        sku,
        name: r[C.name] != null ? String(r[C.name]).trim() : '',
        category: r[C.category] != null ? String(r[C.category]).trim() : '',
        barcode: r[C.barcode] != null ? String(r[C.barcode]).trim() : '',
        size:
          sizeRaw != null && String(sizeRaw).trim() && String(sizeRaw).trim() !== 'nan'
            ? String(sizeRaw).trim()
            : null,
        price,
      }
    })
    .filter((x) => x && x.sku && x.name)
}

// ── 3) 마스터 + 표시정보 머지 → Product 목록 ──
function buildProducts(master) {
  const warnings = []
  const products = []
  for (const m of master) {
    if (cfg.excludeCodes.includes(m.sku)) continue
    if (cfg.excludeCategories.includes(m.category)) continue
    if (m.price < cfg.minPrice) continue
    const slug = cfg.categoryMap[m.category]
    if (!slug) {
      warnings.push(`카테고리 매핑 없음 → 제외: ${m.sku} ${m.name} (${m.category})`)
      continue
    }
    const pres = presentation[m.sku] || {}
    if (!presentation[m.sku]) {
      warnings.push(`표시정보 없음(플레이스홀더 사용): ${m.sku} ${m.name}`)
    }
    const id =
      pres.id ||
      (m.barcode ? 'WP' + m.barcode.replace(/\s+/g, '') : 'WP' + m.sku)
    // 사이즈 표기 정규화: 숫자 사이의 x/X → × (예: 8.5x7cm → 8.5×7cm)
    let size = pres.size || m.size || null
    if (size) size = size.replace(/(\d)\s*[xX]\s*(\d)/g, '$1×$2')
    const product = {
      id,
      name: pres.name || m.name,
      category: slug,
      size: size || undefined,
      holes: pres.holes,
      holeSize: pres.holeSize,
      code: m.sku,
      note: pres.note,
      priceVatIncluded: m.price,
      imageColor: pres.image ? undefined : pres.imageColor || '#ECEFF1',
      image: pres.image,
      _order: pres.order ?? Number.MAX_SAFE_INTEGER,
    }
    if (!pres.image && !pres.imageColor) {
      warnings.push(`이미지 없음(색상 플레이스홀더): ${m.sku} ${product.name}`)
    }
    products.push(product)
  }
  // 정렬: 카테고리 순서 → 기존 표시 순서(order) → 코드
  const catIdx = (c) => {
    const i = cfg.categoryOrder.indexOf(c)
    return i === -1 ? 999 : i
  }
  products.sort(
    (a, b) =>
      catIdx(a.category) - catIdx(b.category) ||
      a._order - b._order ||
      a.code.localeCompare(b.code),
  )
  return { products, warnings }
}

// ── 4) products.ts 직렬화 ──
function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}
function serialize(products) {
  const order = ['id', 'name', 'category', 'size', 'holes', 'holeSize', 'code', 'note', 'priceVatIncluded', 'imageColor', 'image']
  const lines = []
  lines.push('// ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요.')
  lines.push('// 원천: 재고 상품총괄표 엑셀(상품명·코드·가격·사이즈·카테고리)')
  lines.push('//       + data/product-presentation.json(이미지·구수·발송메모·표시명 override)')
  lines.push('// 갱신: 프로젝트 루트에서  상품동기화.bat  더블클릭  (또는  node scripts/sync-products.mjs)')
  lines.push('')
  lines.push("import { Product } from './types'")
  lines.push('')
  lines.push('export const PRODUCTS: Product[] = [')
  let curCat = null
  for (const p of products) {
    if (p.category !== curCat) {
      curCat = p.category
      lines.push(`  // ── ${cfg.categoryLabel[curCat] || curCat} ──`)
    }
    const parts = []
    for (const k of order) {
      const v = p[k]
      if (v === undefined || v === null) continue
      if (typeof v === 'number') parts.push(`${k}: ${v}`)
      else parts.push(`${k}: '${esc(v)}'`)
    }
    lines.push(`  { ${parts.join(', ')} },`)
  }
  lines.push(']')
  lines.push('')
  lines.push('export function getProductsByCategory(category: string) {')
  lines.push('  return PRODUCTS.filter((p) => p.category === category)')
  lines.push('}')
  lines.push('')
  lines.push('export function getProductById(id: string) {')
  lines.push('  return PRODUCTS.find((p) => p.id === id)')
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

// ── 5) 이전 products.ts 와 비교 (변경 요약) ──
function loadPrev() {
  try {
    const src = readFileSync(join(root, 'lib/products.ts'), 'utf-8')
    const arr = src.slice(src.indexOf('['), src.lastIndexOf(']') + 1)
    const PRODUCTS = new Function(`return ${arr}`)()
    const map = {}
    for (const p of PRODUCTS) map[p.code] = p
    return map
  } catch {
    return {}
  }
}

function diffSummary(prev, products) {
  const cur = {}
  for (const p of products) cur[p.code] = p
  const added = products.filter((p) => !prev[p.code])
  const removed = Object.values(prev).filter((p) => !cur[p.code])
  const priceChanged = products.filter(
    (p) => prev[p.code] && prev[p.code].priceVatIncluded !== p.priceVatIncluded,
  )
  return { added, removed, priceChanged }
}

// ── 실행 ──
const masterPath = findLatestMaster()
const master = readMaster(masterPath)
const { products, warnings } = buildProducts(master)
const prev = loadPrev()
const { added, removed, priceChanged } = diffSummary(prev, products)

console.log('─'.repeat(56))
console.log(`마스터: ${masterPath}`)
console.log(`상품 ${products.length}개 생성 (마스터 ${master.length}행)`)
console.log('─'.repeat(56))
if (added.length) {
  console.log(`➕ 신규 ${added.length}:`)
  added.forEach((p) => console.log(`   ${p.code} ${p.name} (${p.priceVatIncluded}원)`))
}
if (removed.length) {
  console.log(`➖ 제거 ${removed.length}:`)
  removed.forEach((p) => console.log(`   ${p.code} ${p.name}`))
}
if (priceChanged.length) {
  console.log(`💲 가격변경 ${priceChanged.length}:`)
  priceChanged.forEach((p) =>
    console.log(`   ${p.code} ${p.name}: ${prev[p.code].priceVatIncluded} → ${p.priceVatIncluded}`),
  )
}
if (!added.length && !removed.length && !priceChanged.length) {
  console.log('변경 없음 (목록·가격 동일)')
}
if (warnings.length) {
  console.log('─'.repeat(56))
  console.log(`⚠️ 확인 필요 ${warnings.length}:`)
  warnings.forEach((w) => console.log(`   ${w}`))
}
console.log('─'.repeat(56))

if (CHECK_ONLY) {
  console.log('--check 모드: 파일 미수정.')
} else {
  // 직렬화 시 내부 정렬 키 제거
  products.forEach((p) => delete p._order)
  writeFileSync(join(root, 'lib/products.ts'), serialize(products), 'utf-8')
  console.log('✅ lib/products.ts 생성 완료.')
}
