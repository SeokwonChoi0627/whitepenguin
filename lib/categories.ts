import { Category } from './types'

export const CATEGORIES: Category[] = [
  {
    key: 'baking-mold',
    label: '제과틀',
    emoji: '🍰',
    description: '마들렌, 피낭시에, 까눌레 등 전문 베이킹 틀',
  },
  {
    key: 'banneton',
    label: '반느통',
    emoji: '🥖',
    description: '원형·바게트·삼각형 등 다양한 발효 바구니',
  },
  {
    key: 'cover-cloth',
    label: '커버천',
    emoji: '🧵',
    description: '반느통 전용 면포 커버',
  },
  {
    key: 'cookie-cutter',
    label: '쿠키틀',
    emoji: '🍪',
    description: '동물·캐릭터·계절 테마 쿠키 커터 세트',
  },
  {
    key: 'pudding-mold',
    label: '푸딩틀',
    emoji: '🍮',
    description: '고양이·토끼·오리·카피바라 실리콘 푸딩틀',
  },
  {
    key: 'tools',
    label: '도구',
    emoji: '🧹',
    description: '스크레퍼, 쿠프나이프, 반자동체, 브러시 등',
  },
  {
    key: 'consumables',
    label: '소모품',
    emoji: '📦',
    description: '짤주머니, OPP 봉투, 지퍼백 등 소모성 용품',
  },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<string, Category>
