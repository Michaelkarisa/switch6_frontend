import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose the dev server on all network interfaces so it's reachable
  // via the machine's LAN/WiFi IP (e.g. http://192.168.x.x:3000).
  // Run with: next dev -H 0.0.0.0   (or set the env var below)
  experimental: {},
};

// When run via `next dev`, Next.js reads HOST env var.
// We export the config; the package.json dev script should be:
//   "dev": "next dev -H 0.0.0.0"
// to bind to all interfaces.

export default nextConfig;
