/**
 * Cinacoin Security Configuration
 * 
 * Centralized security settings for production deployment.
 * Review and update these values before deploying.
 */

// ============================================================
// CORS Configuration
// ============================================================

export const CORS_CONFIG = {
  /** Allowed origins for API requests */
  allowedOrigins: [
    'https://cinacoin.com',
    'https://www.cinacoin.com',
    'https://dashboard.cinacoin.com',
    'https://docs.cinacoin.com',
    // Development origins (remove in production)
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
  ],

  /** Allowed HTTP methods */
  allowedMethods: ['GET', 'POST', 'OPTIONS'],

  /** Allowed headers */
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],

  /** Preflight cache duration (seconds) */
  maxAge: 86400,
};

// ============================================================
// Rate Limiting Configuration
// ============================================================

export const RATE_LIMIT_CONFIG = {
  /** Global API rate limit (requests per minute) */
  global: { limit: 100, period: 60 },
  
  /** Authentication endpoint rate limit (requests per minute) */
  auth: { limit: 10, period: 60 },
  
  /** Transaction endpoint rate limit (requests per minute) */
  transaction: { limit: 30, period: 60 },
  
  /** Event query rate limit (requests per minute) */
  events: { limit: 200, period: 60 },
};

// ============================================================
// Input Validation Configuration
// ============================================================

export const INPUT_VALIDATION = {
  /** Ethereum address regex pattern */
  addressPattern: /^0x[a-fA-F0-9]{40}$/,
  
  /** Event ID pattern (alphanumeric + underscores + hyphens) */
  eventIdPattern: /^[a-zA-Z0-9_-]{1,64}$/,
  
  /** Maximum pagination limit */
  maxLimit: 200,
  
  /** Maximum batch size for event storage */
  maxBatchSize: 10000,
  
  /** Maximum request body size (bytes) */
  maxBodySize: 1048576, // 1MB
};

// ============================================================
// Security Headers
// ============================================================

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// ============================================================
// Logging Configuration
// ============================================================

export const LOGGING_CONFIG = {
  /** Log level for production */
  level: 'warn',
  
  /** Whether to log errors (always true in production) */
  logErrors: true,
  
  /** Whether to log warnings */
  logWarnings: true,
  
  /** Whether to log info (set false in production to reduce noise) */
  logInfo: false,
  
  /** Whether to log debug (always false in production) */
  logDebug: false,
  
  /** Maximum log message length */
  maxMessageLength: 1000,
};

// ============================================================
// Cryptographic Configuration
// ============================================================

export const CRYPTO_CONFIG = {
  /** JWT token expiration (seconds) */
  jwtExpiration: 3600,
  
  /** Session key expiration (seconds) */
  sessionExpiration: 86400,
  
  /** Minimum key length for generated secrets */
  minKeyLength: 32,
};
