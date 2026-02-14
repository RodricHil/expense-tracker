import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/byteeit-bucket/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
       {
        protocol: "https",
        hostname: "developers.google.com",
        pathname: "/identity/images/g-logo.png",
      },
    ],
  },
};

export default nextConfig;

