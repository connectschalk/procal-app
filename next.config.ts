import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/consultant",
        destination: "/talent",
        permanent: true,
      },
      {
        source: "/consultant/edit",
        destination: "/talent/edit",
        permanent: true,
      },
      {
        source: "/consultant/availability",
        destination: "/talent/availability",
        permanent: true,
      },
      {
        source: "/consultant/claim",
        destination: "/talent/claim",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
