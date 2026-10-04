import type { NextConfig } from "next";

// Static export: the site is plain HTML/JS on Netlify and the browser calls
// the Mnemo backend directly (no server functions, so no Netlify timeouts on
// slow answers or large uploads).
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
