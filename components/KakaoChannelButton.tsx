'use client'

import Script from 'next/script'

declare global {
  interface Window {
    Kakao: {
      isInitialized: () => boolean
      init: (key: string) => void
      Channel: {
        chat: (options: { channelPublicId: string }) => void
      }
    }
  }
}

export default function KakaoChannelButton() {
  function handleLoad() {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY!)
    }
  }

  function handleClick() {
    if (typeof window !== 'undefined' && window.Kakao?.isInitialized()) {
      window.Kakao.Channel.chat({ channelPublicId: '_SxdCuX' })
    }
  }

  return (
    <>
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        strategy="afterInteractive"
        onLoad={handleLoad}
      />
      <button
        onClick={handleClick}
        style={{ backgroundColor: '#FEE500' }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        aria-label="카카오톡 채널 채팅 상담"
      >
        <svg
          width="30"
          height="28"
          viewBox="0 0 39 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M19.5 0C8.73 0 0 7.163 0 16c0 5.387 3.05 10.14 7.75 13.1L5.85 36l7.6-4.34c1.95.51 3.97.78 6.05.78C30.27 32.44 39 25.277 39 16.44 39 7.163 30.27 0 19.5 0z"
            fill="#391B1B"
          />
        </svg>
      </button>
    </>
  )
}
