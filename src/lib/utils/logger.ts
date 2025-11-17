/**
 * Development-only logger utility
 * All log statements are stripped in production builds
 */

export const logger = {
  log: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.error(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug(...args);
    }
  },
};
