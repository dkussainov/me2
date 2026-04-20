import { create } from 'zustand';
import type {
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '@me2/types';
import { taskRepository } from '@/db/taskRepository';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
}

interface TaskStoreState {
  tasks: Task[];
  selectedTaskId: string | null;
  filters: TaskFilters;
  syncStatus: SyncStatus;
  lastSyncError: string | null;

  setTasks: (tasks: Task[]) => void;
  setSelected: (id: string | null) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;

  addTask: (task: Task, userId: string) => Promise<Task>;
  updateTask: (id: string, fields: UpdateTaskInput) => Promise<Task | null>;
  removeTask: (id: string) => Promise<void>;
  hydrateFromLocal: (userId: string) => Promise<void>;
}

export const useTaskStore = create<TaskStoreState>()((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  filters: {},
  syncStatus: 'idle',
  lastSyncError: null,

  setTasks: (tasks) => set({ tasks }),
  setSelected: (id) => set({ selectedTaskId: id }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setSyncStatus: (status, error = null) => set({ syncStatus: status, lastSyncError: error }),

  addTask: async (task, userId) => {
    await taskRepository.insert(task, userId);
    set((state) => ({ tasks: [task, ...state.tasks] }));
    return task;
  },

  updateTask: async (id, fields) => {
    const updated = await taskRepository.update(id, fields);
    if (!updated) return null;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  removeTask: async (id) => {
    await taskRepository.softDelete(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    }));
  },

  hydrateFromLocal: async (userId) => {
    const tasks = await taskRepository.listForUser(userId);
    set({ tasks });
  },
}));

export function selectVisibleTasks(state: TaskStoreState): Task[] {
  const { tasks, filters } = state;
  return tasks.filter((t) => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    return true;
  });
}
