/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'http://192.168.1.207:3000',
    'http://localhost:3000',
7  ],
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore TypeScript errors
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
    
  },
}

module.exports = nextConfig