import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/index.html": ["./index.html"]
  }
};

export default nextConfig;
