import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

const lanAddresses = Object.values(networkInterfaces()).flatMap((interfaces) =>
  (interfaces ?? [])
    .filter(({ family, internal }) => family === "IPv4" && !internal)
    .map(({ address }) => address),
);

const nextConfig: NextConfig = {
  // Allow the dev connection when a browser opens this machine by its LAN IP.
  allowedDevOrigins: lanAddresses,
  // Keep the dev badge clear of the sidebar's Log out button (bottom-left).
  devIndicators: { position: "bottom-right" },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    proxyClientMaxBodySize: "100mb",
  },
};

export default nextConfig;
