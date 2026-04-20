import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import type { TaskParseOutput } from '@me2/types';
import { apiFetch } from '@/lib/api';

export interface AIParseInput {
  input: string;
}

async function parseTask(input: AIParseInput): Promise<TaskParseOutput> {
  return apiFetch<TaskParseOutput>('/api/v1/ai/parse', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function useAIParse(): UseMutationResult<TaskParseOutput, Error, AIParseInput> {
  return useMutation<TaskParseOutput, Error, AIParseInput>({
    mutationFn: parseTask,
  });
}
