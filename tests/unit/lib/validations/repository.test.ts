import { describe, expect, it } from 'vitest';
import {
  RepositoryConnectionSchema,
  RepositoryCreationSchema,
  RepositoryPasswordSchema,
} from '@/lib/validations/repository';

describe('RepositoryPasswordSchema', () => {
  it('accepts strong password with all requirements', () => {
    const result = RepositoryPasswordSchema.safeParse('SecurePass123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('SecurePass123');
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const result = RepositoryPasswordSchema.safeParse('Short1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 8 characters');
    }
  });

  it('rejects password without uppercase letter', () => {
    const result = RepositoryPasswordSchema.safeParse('lowercase123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('uppercase');
    }
  });

  it('rejects password without lowercase letter', () => {
    const result = RepositoryPasswordSchema.safeParse('UPPERCASE123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('lowercase');
    }
  });

  it('rejects password without number', () => {
    const result = RepositoryPasswordSchema.safeParse('NoNumbersHere');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('number');
    }
  });

  it('accepts password with special characters', () => {
    const result = RepositoryPasswordSchema.safeParse('Secure@Pass123!');
    expect(result.success).toBe(true);
  });
});

describe('RepositoryConnectionSchema', () => {
  it('accepts valid filesystem repository connection', () => {
    const result = RepositoryConnectionSchema.safeParse({
      type: 'filesystem',
      path: '/backup/kopia-repo',
      password: 'SecurePass123',
    });
    expect(result.success).toBe(true);
  });

  it('requires password for connection', () => {
    const result = RepositoryConnectionSchema.safeParse({
      type: 'filesystem',
      path: '/backup/kopia-repo',
    });
    expect(result.success).toBe(false);
  });

  it('accepts connection without path (for cloud storage)', () => {
    const result = RepositoryConnectionSchema.safeParse({
      type: 's3',
      bucket: 'my-bucket',
      password: 'SecurePass123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid S3 repository connection', () => {
    const result = RepositoryConnectionSchema.safeParse({
      type: 's3',
      bucket: 'my-backup-bucket',
      region: 'us-west-2',
      accessKeyID: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      password: 'SecurePass123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts Azure blob storage configuration', () => {
    const result = RepositoryConnectionSchema.safeParse({
      type: 'azureBlob',
      container: 'backups',
      storageAccount: 'myaccount',
      storageKey: 'base64encodedkey==',
      password: 'SecurePass123',
    });
    expect(result.success).toBe(true);
  });
});

describe('RepositoryCreationSchema', () => {
  it('accepts valid repository creation', () => {
    const result = RepositoryCreationSchema.safeParse({
      type: 'filesystem',
      path: '/backup/new-repo',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = RepositoryCreationSchema.safeParse({
      type: 'filesystem',
      path: '/backup/new-repo',
      password: 'SecurePass123',
      confirmPassword: 'DifferentPass456',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('match');
    }
  });

  it('applies password strength validation to creation', () => {
    const result = RepositoryCreationSchema.safeParse({
      type: 'filesystem',
      path: '/backup/new-repo',
      password: 'weak',
      confirmPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('accepts creation with description', () => {
    const result = RepositoryCreationSchema.safeParse({
      type: 'filesystem',
      path: '/backup/new-repo',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      description: 'My personal backup repository',
    });
    expect(result.success).toBe(true);
  });
});
