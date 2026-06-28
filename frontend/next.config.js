/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return [];
    const origin = apiUrl.replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/socket.io/:path*',
        destination: `${origin}/socket.io/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
