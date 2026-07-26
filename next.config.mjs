/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kelosocial.sirv.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;