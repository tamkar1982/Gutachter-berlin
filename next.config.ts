import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/landing.html",
        permanent: false
      }
    ];
  },
  outputFileTracingIncludes: {
    "/landing.html": ["./index.html"]
  }
};

export default nextConfig;
