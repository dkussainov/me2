import { z } from 'zod';

export const IntegrationService = ['github', 'linear', 'jira', 'gmail'] as const;
export type IntegrationService = (typeof IntegrationService)[number];

export const IntegrationServiceSchema = z.enum(IntegrationService);

export const IntegrationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  service: IntegrationServiceSchema,
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  scopes: z.array(z.string()),
  expires_at: z.string().datetime().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Integration = z.infer<typeof IntegrationSchema>;

export const CreateIntegrationInputSchema = z.object({
  service: IntegrationServiceSchema,
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  scopes: z.array(z.string()),
  expires_at: z.string().datetime().optional(),
});

export type CreateIntegrationInput = z.infer<typeof CreateIntegrationInputSchema>;
