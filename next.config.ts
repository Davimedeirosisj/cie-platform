import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Import batches send mapped row data as JSON to a Server Action;
      // a full município's seções can add up to a few MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
