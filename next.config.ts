import type { NextConfig } from "next";

const urlPrefix = process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: urlPrefix || undefined,
  allowedDevOrigins: ["portal-workspaces-ws-298e92-d6ef868b0d9d.samsungsdscoe.com"],
};

export default nextConfig;
