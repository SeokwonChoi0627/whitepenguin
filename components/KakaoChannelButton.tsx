'use client'

export default function KakaoChannelButton() {
  return (
    <a
      href="https://pf.kakao.com/_SxdCuX/chat"
      target="_blank"
      rel="noreferrer noopener"
      style={{ backgroundColor: '#FEE500' }}
      className="fixed bottom-6 right-6 z-50 w-20 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 py-3 px-2 transition-transform hover:scale-110 active:scale-95"
      aria-label="카카오톡 채널 채팅 상담"
    >
      <svg
        width="40"
        height="37"
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
      <span className="text-xs font-bold text-gray-800 leading-tight text-center whitespace-nowrap">
        채팅상담하기
      </span>
    </a>
  )
}
