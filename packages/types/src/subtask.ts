import { z } from 'zod';

export const SubtaskStatus = ['open', 'done'] as const;
export type SubtaskStatus = (typeof SubtaskStatus)[number];

export const SubtaskStatusSchema = z.enum(SubtaskStatus);

export const SubtaskSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  status: SubtaskStatusSchema,
  order_index: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().optional(),
});

export type Subtask = z.infer<typeof SubtaskSchema>;

export const CreateSubtaskInputSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  status: SubtaskStatusSchema.default('open'),
  order_index: z.number().int().nonnegative(),
});

export type CreateSubtaskInput = z.infer<typeof CreateSubtaskInputSchema>;

export const UpdateSubtaskInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: SubtaskStatusSchema.optional(),
  order_index: z.number().int().nonnegative().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

export type UpdateSubtaskInput = z.infer<typeof UpdateSubtaskInputSchema>;
