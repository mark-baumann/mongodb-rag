/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverComponentsExternalPackages: ["pdf-parse"],
      },    
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.watchOptions = {
                ignored: [
                    '**/scripts/**',
                ]
            }
        }
        return config
    }
};

export default nextConfig;
