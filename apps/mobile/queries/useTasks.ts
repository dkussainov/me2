import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Task } from '@me2/types';
import { apiFetch } from '@/lib/api';
import { useTaskStore } from '@/stores/taskStore';

export interface TasksPage {
  tasks: Task[];
  next_cursor: string | null;
}

export const TASKS_QUERY_KEY = ['tasks'] as const;

async function fetchTasks(): Promise<TasksPage> {
  return apiFetch<TasksPage>('/api/v1/tasks?limit=100');
}

export function useTasks(): UseQueryResult<TasksPage> {
  const setTasks = useTaskStore((s) => s.setTasks);
  const setSyncStatus = useTaskStore((s) => s.setSyncStatus);
  const queryClient = useQueryClient();

  const query = useQuery<TasksPage>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: 30_000,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (query.isFetching) setSyncStatus('syncing');
    else if (query.isError) setSyncStatus('error', query.error?.message ?? 'sync_failed');
    else if (query.isSuccess) setSyncStatus('synced');
  }, [query.isFetching, query.isError, query.isSuccess, query.error, setSyncStatus]);

  useEffect(() => {
    if (query.data) setTasks(query.data.tasks);
  }, [query.data, setTasks]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [queryClient]);

  return query;
}
