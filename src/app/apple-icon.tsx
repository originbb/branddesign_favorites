import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1d1d1f',
        }}
      >
        <svg
          width="112"
          height="112"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFE066" />
              <stop offset="1" stopColor="#FFC107" />
            </linearGradient>
          </defs>
          <path
            d="M16,5.5 L18.70,12.78 L26.46,13.10 L20.38,17.92 L22.47,25.40 L16,21.10 L9.53,25.40 L11.62,17.92 L5.54,13.10 L13.30,12.78 Z"
            fill="url(#g)"
            stroke="#FFD84D"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
