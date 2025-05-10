/**
 * Environment variables utility
 * This provides a simplified interface for accessing environment variables with validation
 */
import getConfig from 'next/config';

// Get Next.js runtime configs
const { serverRuntimeConfig = {}, publicRuntimeConfig = {} } = getConfig() || {
  serverRuntimeConfig: {},
  publicRuntimeConfig: {}
};

// Detect if the runtime configs are empty and log a warning in development
if (process.env.NODE_ENV === 'development' && 
    Object.keys(serverRuntimeConfig).length === 0 && 
    typeof window === 'undefined') {
  console.warn('⚠️ Server runtime config is empty! Environment variables may not be loaded correctly.');
}

// Critical environment variables that must be set for the application to work
// We'll check both the prefixed and non-prefixed versions
const REQUIRED_ENV_VARS = [
  { prefixed: 'NEXT_SERVER_PERPLEXITY_API_KEY', regular: 'PERPLEXITY_API_KEY' },
  { prefixed: 'NEXT_SERVER_FIRECRAWL_API_KEY', regular: 'FIRECRAWL_API_KEY' }
];

// Available model options for validation
const AVAILABLE_MODELS = [
  'deepseek/deepseek-r1:free',
  'perplexity/sonar-pro',
  'perplexity/llama-3.1-sonar-small-128k-online',
  'perplexity/llama-3.1-sonar-large-128k-chat',
  'perplexity/llama-3.1-sonar-small-128k-chat',
  'perplexity/sonar',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3-sonnet',
  'openai/gpt-4o',
  'meta/llama-3-70b-instruct',
  'google/gemini-2.0-flash-001',
  // Legacy options for backward compatibility
  'openai/o1',
  'openai/o1-mini', 
  'openai/o3-mini',
  'anthropic/claude-3-opus'
];

/**
 * Multiple checks to detect if we're in a build environment or browser
 * This is crucial to prevent environment validation errors during build or in browser
 */
export const isBuildTime = () => {
  // Check if we're running in the browser
  const isBrowser = typeof window !== 'undefined';
  
  // Common Next.js build environments
  const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';
  const isVercelBuild = process.env.VERCEL === '1' && !process.env.VERCEL_ENV;
  const isCIBuild = process.env.CI === 'true' || process.env.CI === '1';
  
  // Build vs runtime context
  if (!isBrowser && 
      typeof process !== 'undefined' && 
      process.env.NODE_ENV === 'production') {
    if (isNextBuild || isVercelBuild || isCIBuild) {
      console.log('🔨 Build-time environment detected');
      return true;
    }
  }
  
  return false;
};

// Detect if we're in a browser environment - never validate env vars in browser
const IS_BROWSER = typeof window !== 'undefined';

// Initialize the build time detection early
const IS_BUILD_TIME = isBuildTime();

/**
 * Validates if all required environment variables are set
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  // Skip validation during build time or in browser
  if (IS_BUILD_TIME || IS_BROWSER) {
    return { valid: true, missing: [] };
  }

  const missing: string[] = [];

  // Check for required environment variables (both prefixed and regular versions)
  for (const envVar of REQUIRED_ENV_VARS) {
    // Check multiple sources for the variables in order:
    // 1. Process environment with prefixed name
    // 2. Next.js serverRuntimeConfig
    // 3. Process environment with regular name
    const prefixedValue = process.env[envVar.prefixed];
    const configValue = serverRuntimeConfig[envVar.regular];
    const regularValue = process.env[envVar.regular];
    
    if ((!prefixedValue || prefixedValue.trim() === '') && 
        (!configValue || configValue.trim() === '') && 
        (!regularValue || regularValue.trim() === '')) {
      // If no version is set, add both to the missing array for better error reporting
      missing.push(`${envVar.prefixed} or ${envVar.regular}`);
    }
  }

  // In development mode, provide helpful information
  if (process.env.NODE_ENV === 'development' && missing.length > 0) {
    console.error(`\n⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.error(`Add them to your .env.local file in this format:\n`);
    for (const missingVar of missing) {
      console.error(`${missingVar.split(' or ')[0]}=your-value-here`);
    }
    console.error(`\nThen restart your development server.\n`);
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Gets an API key with proper fallback and validation
 */
function getApiKey(key: string, fallback: string = ''): string {
  // During build time or in browser, always return a placeholder to prevent errors
  if (IS_BUILD_TIME || IS_BROWSER) {
    return 'placeholder-for-client-side';
  }
  
  // Check for server prefix first, then regular name
  const serverKey = `NEXT_SERVER_${key}`;
  
  // Check multiple sources in order of preference:
  // 1. Process environment variables prefixed
  // 2. Next.js serverRuntimeConfig
  // 3. Process environment variables regular
  // 4. Fallback value
  const prefixedValue = process.env[serverKey];
  const configValue = serverRuntimeConfig[key];
  const regularValue = process.env[key];
  
  const value = prefixedValue || configValue || regularValue || fallback;
  
  // Only warn in development mode
  if (!value && process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ Warning: ${key} is not set. Using fallback.`);
  }
  
  return value;
}

/**
 * Environment object with typed access to environment variables and default values
 */
export const env = {
  // API keys
  PERPLEXITY_API_KEY: getApiKey('PERPLEXITY_API_KEY'),
  FIRECRAWL_API_KEY: getApiKey('FIRECRAWL_API_KEY'),
  
  // Other configuration
  PERPLEXITY_MODEL: (() => {
    // Check both process.env and publicRuntimeConfig
    const model = process.env.PERPLEXITY_MODEL || 
                 (publicRuntimeConfig?.PERPLEXITY_MODEL) || 
                 'sonar-pro'; // Default model for Perplexity API key only (no Firecrawl)
    return AVAILABLE_MODELS.includes(model) ? model : 'sonar-pro'; // Default model for Perplexity API key only (no Firecrawl)
  })(),
  PERPLEXITY_TEMPERATURE: parseFloat(process.env.PERPLEXITY_TEMPERATURE || '0.7'),
  PERPLEXITY_MAX_TOKENS: parseInt(process.env.PERPLEXITY_MAX_TOKENS || '4000'),
  PERPLEXITY_BASE_URL: process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai/chat/completions',
  DEFAULT_MODEL_KEY: process.env.DEFAULT_MODEL_KEY || 'deepseek-distill-70b',
  APP_URL: process.env.APP_URL || publicRuntimeConfig?.APP_URL || 'http://localhost:3000',
  APP_NAME: process.env.APP_NAME || publicRuntimeConfig?.APP_NAME || 'Advanced Deep Research',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Environment status
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  IS_BUILD_TIME,
  IS_BROWSER,
  
  // Check if we're missing any required variables (for conditional logic)
  IS_VALID: () => validateEnv().valid
};

// Debug output in development mode on server
if (!IS_BROWSER && env.IS_DEV) {
  console.log('🔧 Environment Configuration:');
  console.log(` - Environment: ${env.NODE_ENV}`);
  console.log(` - API Keys: ${env.PERPLEXITY_API_KEY ? '[SET]' : '[NOT SET]'}, ${env.FIRECRAWL_API_KEY ? '[SET]' : '[NOT SET]'}`);
  console.log(` - Model: ${env.PERPLEXITY_MODEL}`);
}

// For logging only - we never throw errors during initialization in browser or build
if (IS_BUILD_TIME) {
  console.log('🔨 Running in build mode - environment validation skipped');
} else if (IS_BROWSER) {
  // No validation in browser - just log in development
  if (env.IS_DEV) {
    console.log('🌐 Running in browser - environment validation skipped');
  }
} else {
  const envStatus = validateEnv();
  if (!envStatus.valid) {
    console.error(`⚠️ Missing required environment variables: ${envStatus.missing.join(', ')}`);
    
    // Only throw in production server-side runtime, never during build or in browser
    if (process.env.NODE_ENV === 'production' && !IS_BUILD_TIME && !IS_BROWSER) {
      throw new Error(`Missing required environment variables: ${envStatus.missing.join(', ')}`);
    }
  }
} 
