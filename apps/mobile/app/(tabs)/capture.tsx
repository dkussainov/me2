import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { CreateTaskInput, Task, TaskParseOutput } from '@me2/types';
import { priorityColors } from '@/constants/tokens';
import { useTaskStore } from '@/stores/taskStore';
import { useAIParse } from '@/queries/useAIParse';

const LOCAL_USER_ID = 'local-user';

function formatParsedDue(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ParsedPreview({ preview }: { preview: TaskParseOutput }) {
  const due = formatParsedDue(preview.due_date);
  return (
    <View className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <Text className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        AI preview · {Math.round(preview.confidence * 100)}%
      </Text>
      <Text className="mt-2 text-base text-white">{preview.title}</Text>
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {preview.priority && (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: priorityColors[preview.priority] + '33' }}
          >
            <Text
              className="text-[11px] font-semibold"
              style={{ color: priorityColors[preview.priority] }}
            >
              {preview.priority}
            </Text>
          </View>
        )}
        {preview.category && (
          <View className="rounded-full bg-zinc-800 px-2 py-0.5">
            <Text className="text-[11px] text-zinc-300">{preview.category}</Text>
          </View>
        )}
        {due && (
          <View className="rounded-full bg-zinc-800 px-2 py-0.5">
            <Text className="text-[11px] text-zinc-300">{due}</Text>
          </View>
        )}
        {preview.assignees.map((name) => (
          <View key={name} className="rounded-full bg-blue-500/20 px-2 py-0.5">
            <Text className="text-[11px] text-blue-300">@ {name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function CaptureScreen() {
  const router = useRouter();
  const addTask = useTaskStore((s) => s.addTask);
  const parseMutation = useAIParse();
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = parseMutation.data ?? null;
  const isParsing = parseMutation.isPending;

  const canParse = useMemo(() => input.trim().length > 0 && !isParsing, [input, isParsing]);
  const canSave = useMemo(() => input.trim().length > 0 && !saving, [input, saving]);

  const handleParse = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setError(null);
    parseMutation.mutate({ input: trimmed });
  }, [input, parseMutation]);

  const handleSave = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || saving) return;
    setError(null);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const task: Task = {
        id: generateUuid(),
        title: preview?.title ?? trimmed,
        status: 'open',
        priority: preview?.priority ?? undefined,
        category: preview?.category ?? undefined,
        due_date: preview?.due_date ?? undefined,
        source: 'manual',
        ai_confidence: preview?.confidence,
        assignee_name: preview?.assignees[0],
        created_at: now,
        updated_at: now,
      };

      const payload: CreateTaskInput = {
        id: task.id,
        title: task.title,
        status: 'open',
        priority: task.priority,
        category: task.category,
        due_date: task.due_date,
        source: 'manual',
        ai_confidence: task.ai_confidence,
        assignee_name: task.assignee_name,
      };

      await addTask(task, LOCAL_USER_ID);

      try {
        const { apiFetch } = await import('@/lib/api');
        await apiFetch('/api/v1/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        // Offline / unauthenticated — SQLite already has the write, sync will retry later.
      }

      setInput('');
      parseMutation.reset();
      router.navigate('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save_failed');
    } finally {
      setSaving(false);
    }
  }, [input, preview, saving, addTask, parseMutation, router]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-4 py-3">
          <Text className="text-2xl font-bold text-white">Capture</Text>
          <Text className="mt-1 text-sm text-zinc-400">
            Describe the task. AI will extract due date, priority, and category.
          </Text>
        </View>

        <View className="flex-1 px-4">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="e.g. Remind me to call the dentist tomorrow at 4pm"
            placeholderTextColor="#71717a"
            multiline
            textAlignVertical="top"
            maxLength={5000}
            className="min-h-[120px] rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-base text-white"
          />

          {preview && <ParsedPreview preview={preview} />}
          {parseMutation.isError && (
            <Text className="mt-3 text-sm text-red-400">
              Parse failed: {parseMutation.error?.message ?? 'unknown_error'}
            </Text>
          )}
          {error && <Text className="mt-3 text-sm text-red-400">{error}</Text>}
        </View>

        <View className="flex-row items-center gap-3 border-t border-zinc-900 bg-zinc-950 px-4 py-3">
          <Pressable
            onPress={handleParse}
            disabled={!canParse}
            className={`flex-1 items-center rounded-lg border border-zinc-700 px-4 py-3 ${
              canParse ? '' : 'opacity-40'
            }`}
          >
            {isParsing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-sm font-medium text-white">Parse with AI</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              void handleSave();
            }}
            disabled={!canSave}
            className={`flex-1 items-center rounded-lg bg-blue-500 px-4 py-3 ${
              canSave ? '' : 'opacity-40'
            }`}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-sm font-semibold text-white">Save</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
