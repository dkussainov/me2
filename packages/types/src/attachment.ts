import { z } from 'zod';

export const AttachmentType = [
  'image',
  'file',
  'url',
  'code_snippet',
  'email_thread',
] as const;
export type AttachmentType = (typeof AttachmentType)[number];

export const AttachmentTypeSchema = z.enum(AttachmentType);

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  type: AttachmentTypeSchema,
  url: z.string().url().optional(),
  content: z.string().max(20_000).optional(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  file_path: z.string().optional(),
  line_number: z.number().int().nonnegative().optional(),
  created_at: z.string().datetime(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

export const CreateAttachmentInputSchema = z.object({
  task_id: z.string().uuid(),
  type: AttachmentTypeSchema,
  url: z.string().url().optional(),
  content: z.string().max(20_000).optional(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  file_path: z.string().optional(),
  line_number: z.number().int().nonnegative().optional(),
});

export type CreateAttachmentInput = z.infer<typeof CreateAttachmentInputSchema>;
