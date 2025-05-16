/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use export instead of output: 'export' for Next.js 13
  // This will generate static HTML files
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Don't attempt to handle content scripts in Next.js
  webpack: (config) => {
    // Exclude content-scripts from Next.js build
    config.externals = [
      ...(config.externals || []),
      (context, request, callback) => {
        if (request.startsWith('./content-scripts/') || request === './background') {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ];
    return config;
  },
};

export default nextConfig;
