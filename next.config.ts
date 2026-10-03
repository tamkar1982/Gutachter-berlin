import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/landing.html": ["./index.html"]
  }
};

export default nextConfig;
