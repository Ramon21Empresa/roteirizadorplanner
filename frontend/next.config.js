/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite importar CSS do Leaflet
  transpilePackages: ['leaflet', 'react-leaflet'],
}

module.exports = nextConfig
