/**
 * Development-only logger utility
 * All log statements are stripped in production builds
 */

const noop = () => {};

export const logger = import.meta.env.DEV
  ? console
  : { log: noop, error: noop, warn: noop, info: noop, debug: noop };
