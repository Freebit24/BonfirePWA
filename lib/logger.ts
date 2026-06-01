/**
 * Environment-aware logger utility
 * - log() and warn() only output in development
 * - error() outputs in all environments
 * - Helps keep production builds clean while maintaining debug capabilities
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Errors always logged for production debugging
    console.error(...args);
  },
};
