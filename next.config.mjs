import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
let nextConfig = {
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

nextConfig = withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    cacheOnFrontendNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    fallbacks: {
        document: '/~offline',
    },
    runtimeCaching: [
        {
            urlPattern: /^\/$/,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'start-url',
                expiration: {
                    maxEntries: 1,
                    maxAgeSeconds: 24 * 60 * 60 // 24 hours
                }
            }
        }
    ]
})(nextConfig);

export default nextConfig;
