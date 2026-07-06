import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '즐겨찾기함',
    short_name: '즐겨찾기함',
    description: '필요한 링크 모음 배포, 나만의 방식으로 구성',
    start_url: '/',
    display: 'standalone',
    background_color: '#1d1d1f',
    theme_color: '#1d1d1f',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
