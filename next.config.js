/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',

  images: { unoptimized: true },
  reactStrictMode: false,

  // Security: Prevent Azure OpenAI secrets from being exposed in client bundles
  // Only NEXT_PUBLIC_* variables are exposed to the client
  // Non-public env vars are server-only and never bundled
};

module.exports = nextConfig;
