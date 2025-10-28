import { z } from 'zod';

/**
 * Retention policy validation schema
 */
export const RetentionPolicySchema = z.object({
  keepLatest: z.number().int().positive().optional(),
  keepHourly: z.number().int().nonnegative().optional(),
  keepDaily: z.number().int().nonnegative().optional(),
  keepWeekly: z.number().int().nonnegative().optional(),
  keepMonthly: z.number().int().nonnegative().optional(),
  keepAnnual: z.number().int().nonnegative().optional(),
});

/**
 * Scheduling policy validation schema
 */
export const SchedulingPolicySchema = z.object({
  interval: z
    .string()
    .regex(/^\d+[hdm]$/, 'Invalid interval format (e.g., 24h, 30m)')
    .optional(),
  manual: z.boolean().optional(),
});

/**
 * Compression policy validation schema
 */
export const CompressionPolicySchema = z
  .object({
    compressorName: z.enum(['gzip', 'zstd', 'none']).optional(),
    minSize: z.number().int().nonnegative().optional(),
    maxSize: z.number().int().positive().optional(),
    onlyCompress: z.array(z.string()).optional(),
    neverCompress: z.array(z.string()).optional(),
  })
  .optional();

/**
 * Full backup policy validation schema
 */
export const BackupPolicySchema = z.object({
  retention: RetentionPolicySchema.optional(),
  scheduling: SchedulingPolicySchema.optional(),
  compression: CompressionPolicySchema.optional(),
  excludeRules: z.array(z.string()).optional(),
});

export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;
export type SchedulingPolicy = z.infer<typeof SchedulingPolicySchema>;
export type CompressionPolicy = z.infer<typeof CompressionPolicySchema>;
export type BackupPolicy = z.infer<typeof BackupPolicySchema>;
