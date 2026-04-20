import type { TaskPriority, TaskStatus } from '@me2/types';

export const colors = {
  bg: {
    primary: '#09090b',
    secondary: '#18181b',
    tertiary: '#27272a',
  },
  border: {
    subtle: '#27272a',
    strong: '#3f3f46',
  },
  text: {
    primary: '#ffffff',
    secondary: '#a1a1aa',
    muted: '#71717a',
    inverse: '#09090b',
  },
  accent: {
    primary: '#3b82f6',
    hover: '#2563eb',
    subtle: 'rgba(59, 130, 246, 0.15)',
  },
  state: {
    success: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
  },
} as const;

export const priorityColors: Record<TaskPriority, string> = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#3b82f6',
  P4: '#71717a',
};

export const priorityLabels: Record<TaskPriority, string> = {
  P1: 'Urgent',
  P2: 'High',
  P3: 'Normal',
  P4: 'Someday',
};

export const statusColors: Record<TaskStatus, string> = {
  open: '#3b82f6',
  in_progress: '#eab308',
  done: '#22c55e',
  cancelled: '#71717a',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
} as const;

export const twBg = {
  primary: 'bg-zinc-950',
  secondary: 'bg-zinc-900',
  tertiary: 'bg-zinc-800',
  accent: 'bg-blue-500',
} as const;

export const twText = {
  primary: 'text-white',
  secondary: 'text-zinc-400',
  muted: 'text-zinc-500',
  accent: 'text-blue-500',
} as const;
