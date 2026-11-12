import type { MetadataRoute } from 'next';

// Installing opens the real app (the dark, amber design) at /.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinFlow',
    short_name: 'FinFlow',
    description: 'Private money cockpit on your Google Sheet.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0B0B0C',
    theme_color: '#0B0B0C',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
