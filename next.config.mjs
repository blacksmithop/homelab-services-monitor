/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // Disable source maps in production for smaller build
  productionBrowserSourceMaps: false,
  
  // Enable strict mode
  reactStrictMode: true,
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Optimize images
  images: {
    unoptimized: true,
  },
  
  // Compress responses
  compress: true,
  
  // Skip build-time type checking (handled by CI/CD)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Skip build-time ESLint (handled by CI/CD)
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
