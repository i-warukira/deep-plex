/** @type {import('next').NextConfig} */
const loadEnvConfig = require('./load-env');

// Load environment variables early in the configuration
const { loadedFiles, count } = loadEnvConfig();

// Direct copy of critical keys to ensure they are available
// This ensures environment variables are available regardless of source
const envKeys = [
  'PERPLEXITY_API_KEY',
  'FIRECRAWL_API_KEY',
  'NEXT_SERVER_FIRECRAWL_API_KEY',
  'NEXT_SERVER_PERPLEXITY_API_KEY',
  'PERPLEXITY_MODEL',
];

// Log the loaded environment
console.log(`🔧 Next.js config: Loaded ${count} environment files`);
console.log(`🔑 Environment variables available:`, 
  envKeys.filter(key => process.env[key]).map(key => key));

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Explicitly set environment variables with fallbacks for required keys
  env: {
    // These will be available at build time and will be replaced with actual
    // environment variables at runtime by Next.js
    PERPLEXITY_MODEL: process.env.PERPLEXITY_MODEL || 'sonar-pro',
    NEXT_SERVER_FIRECRAWL_API_KEY: process.env.NEXT_SERVER_FIRECRAWL_API_KEY || '',
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || process.env.NEXT_SERVER_FIRECRAWL_API_KEY || '',
    NEXT_SERVER_PERPLEXITY_API_KEY: process.env.NEXT_SERVER_PERPLEXITY_API_KEY || '',
    PERPLEXITY_MODEL: process.env.PERPLEXITY_MODEL || 'sonar-pro',
    APP_NAME: process.env.APP_NAME || 'Advanced Deep Research',
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    DEFAULT_MODEL_KEY: process.env.DEFAULT_MODEL_KEY || 'perplexity/sonar-pro',
  },
  // Add middleware to ensure server-side environment variables are available
  serverRuntimeConfig: {
    // Will only be available on the server side
    FIRECRAWL_API_KEY: process.env.NEXT_SERVER_FIRECRAWL_API_KEY || process.env.FIRECRAWL_API_KEY || '',
    PERPLEXITY_API_KEY: process.env.NEXT_SERVER_PERPLEXITY_API_KEY || '',
  },
  // Public runtime config for browser access (NO SECRETS SHOULD BE HERE)
  publicRuntimeConfig: {
    // Will be available on both server and client
    APP_NAME: process.env.APP_NAME || 'Advanced Deep Research',
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
    PERPLEXITY_MODEL: process.env.PERPLEXITY_MODEL || 'sonar-pro',
  },
};

module.exports = nextConfig; 