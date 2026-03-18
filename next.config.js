/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com"
      : "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://raw.githubusercontent.com https://*.basemaps.cartocdn.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.stripe.com https://api.featherless.ai https://raw.githubusercontent.com https://*.googleapis.com; frame-src https://js.stripe.com https://checkout.stripe.com; form-action 'self'; base-uri 'self'; object-src 'none';`,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
