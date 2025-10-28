import { describe, expect, it } from 'vitest';
import {
  RetentionPolicySchema,
  SchedulingPolicySchema,
  CompressionPolicySchema,
  BackupPolicySchema,
} from '@/lib/validations/policy';

describe('RetentionPolicySchema', () => {
  it('accepts valid retention policy with all fields', () => {
    const result = RetentionPolicySchema.safeParse({
      keepLatest: 10,
      keepHourly: 24,
      keepDaily: 7,
      keepWeekly: 4,
      keepMonthly: 12,
      keepAnnual: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial retention policy', () => {
    const result = RetentionPolicySchema.safeParse({
      keepLatest: 5,
      keepDaily: 7,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative values', () => {
    const result = RetentionPolicySchema.safeParse({
      keepLatest: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero for keepLatest', () => {
    const result = RetentionPolicySchema.safeParse({
      keepLatest: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero for keepDaily (disables)', () => {
    const result = RetentionPolicySchema.safeParse({
      keepDaily: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty retention policy', () => {
    const result = RetentionPolicySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('SchedulingPolicySchema', () => {
  it('accepts valid interval with hours', () => {
    const result = SchedulingPolicySchema.safeParse({
      interval: '24h',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid interval with days', () => {
    const result = SchedulingPolicySchema.safeParse({
      interval: '7d',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid interval with minutes', () => {
    const result = SchedulingPolicySchema.safeParse({
      interval: '30m',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid interval format', () => {
    const result = SchedulingPolicySchema.safeParse({
      interval: '24hours',
    });
    expect(result.success).toBe(false);
  });

  it('rejects interval without unit', () => {
    const result = SchedulingPolicySchema.safeParse({
      interval: '24',
    });
    expect(result.success).toBe(false);
  });

  it('rejects interval with invalid unit', () => {
    const result = SchedulingPolicySchema.safeParse({
      interval: '24s',
    });
    expect(result.success).toBe(false);
  });

  it('accepts manual scheduling', () => {
    const result = SchedulingPolicySchema.safeParse({
      manual: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts both interval and manual flag', () => {
    const result = SchedulingPolicySchema.safeParse({
      interval: '24h',
      manual: false,
    });
    expect(result.success).toBe(true);
  });
});

describe('CompressionPolicySchema', () => {
  it('accepts valid gzip compression', () => {
    const result = CompressionPolicySchema.safeParse({
      compressorName: 'gzip',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid zstd compression', () => {
    const result = CompressionPolicySchema.safeParse({
      compressorName: 'zstd',
    });
    expect(result.success).toBe(true);
  });

  it('accepts none to disable compression', () => {
    const result = CompressionPolicySchema.safeParse({
      compressorName: 'none',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid compressor name', () => {
    const result = CompressionPolicySchema.safeParse({
      compressorName: 'bzip2',
    });
    expect(result.success).toBe(false);
  });

  it('accepts compression with size limits', () => {
    const result = CompressionPolicySchema.safeParse({
      compressorName: 'gzip',
      minSize: 1024,
      maxSize: 1048576,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative size values', () => {
    const result = CompressionPolicySchema.safeParse({
      minSize: -100,
    });
    expect(result.success).toBe(false);
  });

  it('accepts only compress specific extensions', () => {
    const result = CompressionPolicySchema.safeParse({
      compressorName: 'gzip',
      onlyCompress: ['.txt', '.log', '.csv'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts never compress specific extensions', () => {
    const result = CompressionPolicySchema.safeParse({
      compressorName: 'gzip',
      neverCompress: ['.jpg', '.png', '.zip', '.mp4'],
    });
    expect(result.success).toBe(true);
  });
});

describe('BackupPolicySchema', () => {
  it('accepts complete backup policy', () => {
    const result = BackupPolicySchema.safeParse({
      retention: {
        keepLatest: 10,
        keepDaily: 7,
        keepWeekly: 4,
      },
      scheduling: {
        interval: '24h',
      },
      compression: {
        compressorName: 'zstd',
        minSize: 1024,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial backup policy with only retention', () => {
    const result = BackupPolicySchema.safeParse({
      retention: {
        keepLatest: 5,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial backup policy with only scheduling', () => {
    const result = BackupPolicySchema.safeParse({
      scheduling: {
        interval: '4h',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty backup policy (will use defaults)', () => {
    const result = BackupPolicySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates nested retention rules', () => {
    const result = BackupPolicySchema.safeParse({
      retention: {
        keepLatest: -1, // Invalid
      },
    });
    expect(result.success).toBe(false);
  });

  it('validates nested scheduling rules', () => {
    const result = BackupPolicySchema.safeParse({
      scheduling: {
        interval: 'invalid', // Invalid format
      },
    });
    expect(result.success).toBe(false);
  });

  it('validates nested compression rules', () => {
    const result = BackupPolicySchema.safeParse({
      compression: {
        compressorName: 'invalid', // Invalid compressor
      },
    });
    expect(result.success).toBe(false);
  });
});
