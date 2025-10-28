import { z } from 'zod';

/**
 * Repository password validation schema
 */
export const RepositoryPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Repository connection validation schema
 */
export const RepositoryConnectionSchema = z.object({
  type: z.enum(['filesystem', 's3', 'azure', 'gcs', 'sftp', 'azureBlob', 'b2', 'webdav']),
  // Filesystem
  path: z.string().optional(),
  // S3
  bucket: z.string().optional(),
  region: z.string().optional(),
  accessKeyID: z.string().optional(),
  secretAccessKey: z.string().optional(),
  // Azure
  container: z.string().optional(),
  storageAccount: z.string().optional(),
  storageKey: z.string().optional(),
  // Common
  password: z.string().min(1, 'Password is required'),
});

/**
 * Repository creation validation schema
 */
export const RepositoryCreationSchema = z
  .object({
    type: z.enum(['filesystem', 's3', 'azure', 'gcs', 'sftp', 'azureBlob', 'b2', 'webdav']),
    path: z.string().optional(),
    password: RepositoryPasswordSchema,
    confirmPassword: z.string(),
    description: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RepositoryConnection = z.infer<typeof RepositoryConnectionSchema>;
export type RepositoryCreation = z.infer<typeof RepositoryCreationSchema>;
