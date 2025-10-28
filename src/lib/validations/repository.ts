import { z } from 'zod';

/**
 * Repository connection validation schema
 */
export const RepositoryConnectionSchema = z.object({
  type: z.enum(['filesystem', 's3', 'azure', 'gcs', 'sftp']),
  path: z.string().min(1, 'Repository path is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Repository creation validation schema
 */
export const RepositoryCreationSchema = z
  .object({
    type: z.enum(['filesystem', 's3', 'azure', 'gcs', 'sftp']),
    path: z.string().min(1, 'Repository path is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RepositoryConnection = z.infer<typeof RepositoryConnectionSchema>;
export type RepositoryCreation = z.infer<typeof RepositoryCreationSchema>;
