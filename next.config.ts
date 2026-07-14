import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/resumes/*/build': ['./vendor/tectonic/**', './templates/**'],
  },
};

export default nextConfig;
