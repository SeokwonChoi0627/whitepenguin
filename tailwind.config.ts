import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 컬러 — 로고 기반
        brand: {
          DEFAULT: '#333333',   // 차콜 (펭귄 몸체)
          dark:    '#1a1a1a',   // 더 진한 차콜
          light:   '#5a5a5a',   // 밝은 차콜
        },
        accent: {
          DEFAULT: '#C4A882',   // 웜 탄/밀색 (바게트)
          light:   '#EDE4D8',   // 연한 탄
          dark:    '#A08860',   // 진한 탄
        },
        cream: {
          DEFAULT: '#F7F3EE',   // 크림 배경
          dark:    '#EDE7DF',   // 진한 크림
        },
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
