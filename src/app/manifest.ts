import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PrepWise — Study & Exam Preparation Tracker',
    short_name: 'PrepWise',
    description: 'Master your exam prep with spaced repetition, stopwatch, syllabus matrix, and real-time sync.',
    start_url: '/',
    display: 'standalone',
    background_color: '#14100E',
    theme_color: '#FF8A33',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}
