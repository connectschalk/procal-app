import type { NextConfig } from "next";

function resolveSupabaseHostname() {
  const fallback = "fymfdphrgxkdtwfjbsrn.supabase.co";
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return fallback;
  try {
    return new URL(raw).hostname || fallback;
  } catch {
    return fallback;
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: resolveSupabaseHostname(),
        pathname: "/storage/v1/object/**",
      },
    ],
  },
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
