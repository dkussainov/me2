import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().max(200).optional(),
  avatar_url: z.string().url().optional(),
  apple_id: z.string().optional(),
  timezone: z.string().default('UTC'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  avatar_url: z.string().url().optional(),
  apple_id: z.string().optional(),
  timezone: z.string().default('UTC'),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
