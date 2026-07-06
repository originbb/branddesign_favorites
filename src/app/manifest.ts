import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Brand Design Favorites',
    short_name: 'Brand Design',
    description: 'A collection of brand design favorites',
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
