import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js and Turbopack from bundling pdf-parse and pdfjs-dist into
  // compiled server chunks, allowing Node.js to resolve them from node_modules
  // where global polyfills and shims take effect properly.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;