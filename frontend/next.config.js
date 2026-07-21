/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // build optimisé pour Docker
};

module.exports = nextConfig;
