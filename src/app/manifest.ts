import type { MetadataRoute } from 'next';

// start_url becomes '/' when the v2 UI replaces the current one at cutover.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinFlow',
    short_name: 'FinFlow',
    description: 'Private money cockpit on your Google Sheet.',
    start_url: '/v2',
    scope: '/',
    display: 'standalone',
    background_color: '#EDF0F4',
    theme_color: '#EDF0F4',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
