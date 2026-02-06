import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HC Aces Hockey Hub',
    short_name: 'HC Aces',
    description: 'Oficiální aplikace hokejového týmu HC Aces',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0d0a08',
    theme_color: '#ff8000',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
