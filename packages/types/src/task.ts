import { z } from 'zod';

export const TaskStatus = ['open', 'in_progress', 'done', 'cancelled'] as const;
export type TaskStatus = (typeof TaskStatus)[number];

export const TaskPriority = ['P1', 'P2', 'P3', 'P4'] as const;
export type TaskPriority = (typeof TaskPriority)[number];

export const TaskCategory = [
  'Work',
  'Personal',
  'Email',
  'Errands',
  'Finance',
  'Health',
  'Code',
] as const;
export type TaskCategory = (typeof TaskCategory)[number];

export const TaskSource = [
  'manual',
  'voice',
  'photo',
  'share_sheet',
  'github',
  'linear',
  'jira',
  'email',
  'vscode',
  'cursor',
  'cli',
  'ci_cd',
] as const;
export type TaskSource = (typeof TaskSource)[number];

export const RoutedTo = ['reminders', 'things3', 'notion'] as const;
export type RoutedTo = (typeof RoutedTo)[number];

export const TaskStatusSchema = z.enum(TaskStatus);
export const TaskPrioritySchema = z.enum(TaskPriority);
export const TaskCategorySchema = z.enum(TaskCategory);
export const TaskSourceSchema = z.enum(TaskSource);
export const RoutedToSchema = z.enum(RoutedTo);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  notes: z.string().max(10_000).optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema.optional(),
  category: TaskCategorySchema.optional(),
  due_date: z.string().datetime().optional(),
  reminder_date: z.string().datetime().optional(),
  recurrence_rule: z.string().optional(),
  source: TaskSourceSchema,
  source_url: z.string().url().optional(),
  assignee_name: z.string().max(200).optional(),
  routed_to: RoutedToSchema.optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  notes: z.string().max(10_000).optional(),
  status: TaskStatusSchema.default('open'),
  priority: TaskPrioritySchema.optional(),
  category: TaskCategorySchema.optional(),
  due_date: z.string().datetime().optional(),
  reminder_date: z.string().datetime().optional(),
  recurrence_rule: z.string().optional(),
  source: TaskSourceSchema,
  source_url: z.string().url().optional(),
  assignee_name: z.string().max(200).optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(10_000).optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  category: TaskCategorySchema.optional(),
  due_date: z.string().datetime().nullable().optional(),
  reminder_date: z.string().datetime().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  assignee_name: z.string().max(200).nullable().optional(),
  routed_to: RoutedToSchema.nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const TaskParseOutputSchema = z.object({
  title: z.string().min(1).max(500),
  due_date: z.string().datetime().nullable(),
  priority: TaskPrioritySchema.nullable(),
  category: TaskCategorySchema.nullable(),
  assignees: z.array(z.string().max(200)),
  confidence: z.number().min(0).max(1),
});

export type TaskParseOutput = z.infer<typeof TaskParseOutputSchema>;
