import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin access to dev-mode resources (HMR, etc.) by
  // default. Needed to open the dev server from another device on the LAN
  // (e.g. a phone, for testing the PWA) — dev-only, irrelevant to prod builds.
  //
  // Wildcarded rather than a fixed address: the dev machine's LAN IP is handed
  // out by DHCP and changes between sessions, which silently breaks phone
  // testing again. Each `*` matches exactly one hostname label, i.e. one octet.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],

  // Serve uploaded images from this origin and proxy them to FastAPI.
  //
  // Without this, image URLs had to be built as `${API_URL}${path}` — and
  // API_URL resolves to "localhost:8000" when the page is server-rendered but
  // to the LAN host once it reaches the browser. That broke every photo for
  // anyone opening the app from another device (the phone looked for the image
  // on its own localhost) and, because the two renders disagreed on the src
  // attribute, it also tripped a React hydration mismatch. A same-origin path
  // is identical in both renders and correct from any device.
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return [{ source: "/uploads/:path*", destination: `${backend}/uploads/:path*` }];
  },
};

export default nextConfig;
