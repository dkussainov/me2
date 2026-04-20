import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  TaskCategory,
  TaskPriority,
  type Subtask,
  type Task,
  type UpdateTaskInput,
} from '@me2/types';
import { priorityColors, priorityLabels } from '@/constants/tokens';
import { useTaskStore } from '@/stores/taskStore';
import { taskRepository } from '@/db/taskRepository';
import { getDatabase } from '@/db/migrate';

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

interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  status: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
}

function rowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    task_id: row.task_id,
    title: row.title,
    status: row.status as Subtask['status'],
    order_index: row.order_index,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
  };
}

async function listSubtasks(taskId: string): Promise<Subtask[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<SubtaskRow>(
    `SELECT * FROM subtasks WHERE task_id = ? AND deleted_at IS NULL ORDER BY order_index ASC`,
    [taskId]
  );
  return rows.map(rowToSubtask);
}

async function insertSubtask(subtask: Subtask): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO subtasks
     (id, task_id, title, status, order_index, created_at, updated_at, completed_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      subtask.id,
      subtask.task_id,
      subtask.title,
      subtask.status,
      subtask.order_index,
      subtask.created_at,
      subtask.updated_at,
      subtask.completed_at ?? null,
      subtask.deleted_at ?? null,
    ]
  );
}

async function toggleSubtask(subtaskId: string, done: boolean): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE subtasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    [done ? 'done' : 'open', done ? now : null, now, subtaskId]
  );
}

function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        active ? 'border-transparent' : 'border-zinc-700 bg-transparent'
      }`}
      style={active && color ? { backgroundColor: color } : undefined}
    >
      <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-zinc-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TaskDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const taskId = params.id;
  const router = useRouter();
  const updateTaskAction = useTaskStore((s) => s.updateTask);
  const removeTask = useTaskStore((s) => s.removeTask);

  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [found, subs] = await Promise.all([
        taskRepository.getById(taskId),
        listSubtasks(taskId),
      ]);
      if (cancelled) return;
      setTask(found);
      setSubtasks(subs);
      setTitle(found?.title ?? '');
      setNotes(found?.notes ?? '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleSave = useCallback(async () => {
    if (!task) return;
    setSaving(true);
    try {
      const fields: UpdateTaskInput = {
        title: title.trim() || task.title,
        notes: notes.trim() || undefined,
      };
      const updated = await updateTaskAction(task.id, fields);
      if (updated) setTask(updated);
    } finally {
      setSaving(false);
    }
  }, [task, title, notes, updateTaskAction]);

  const setPriority = useCallback(
    async (next: TaskPriority | null) => {
      if (!task) return;
      const updated = await updateTaskAction(task.id, { priority: next ?? undefined });
      if (updated) setTask(updated);
    },
    [task, updateTaskAction]
  );

  const setCategory = useCallback(
    async (next: (typeof TaskCategory)[number] | null) => {
      if (!task) return;
      const updated = await updateTaskAction(task.id, { category: next ?? undefined });
      if (updated) setTask(updated);
    },
    [task, updateTaskAction]
  );

  const setDueDate = useCallback(
    async (nextIso: string | null) => {
      if (!task) return;
      const updated = await updateTaskAction(task.id, { due_date: nextIso });
      if (updated) setTask(updated);
    },
    [task, updateTaskAction]
  );

  const handleAddSubtask = useCallback(async () => {
    if (!task || !newSubtask.trim()) return;
    const now = new Date().toISOString();
    const subtask: Subtask = {
      id: generateUuid(),
      task_id: task.id,
      title: newSubtask.trim(),
      status: 'open',
      order_index: subtasks.length,
      created_at: now,
      updated_at: now,
    };
    await insertSubtask(subtask);
    setSubtasks((prev) => [...prev, subtask]);
    setNewSubtask('');
  }, [task, newSubtask, subtasks.length]);

  const handleToggleSubtask = useCallback(
    async (subtask: Subtask) => {
      const nextDone = subtask.status !== 'done';
      await toggleSubtask(subtask.id, nextDone);
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtask.id
            ? {
                ...s,
                status: nextDone ? 'done' : 'open',
                completed_at: nextDone ? new Date().toISOString() : undefined,
              }
            : s
        )
      );
    },
    []
  );

  const handleDelete = useCallback(async () => {
    if (!task) return;
    await removeTask(task.id);
    router.back();
  }, [task, removeTask, router]);

  const dueDateLabel = useMemo(() => {
    if (!task?.due_date) return 'Set due date';
    const d = new Date(task.due_date);
    if (Number.isNaN(d.getTime())) return 'Set due date';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [task?.due_date]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="text-lg text-white">Task not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-md bg-blue-500 px-4 py-2">
          <Text className="text-sm font-semibold text-white">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-zinc-950">
      <Stack.Screen options={{ title: 'Task' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-xs uppercase tracking-wide text-zinc-500">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            onBlur={() => {
              void handleSave();
            }}
            multiline
            className="mt-1 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-lg text-white"
            placeholder="Task title"
            placeholderTextColor="#71717a"
          />

          <Text className="mt-5 text-xs uppercase tracking-wide text-zinc-500">Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={() => {
              void handleSave();
            }}
            multiline
            textAlignVertical="top"
            className="mt-1 min-h-[96px] rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-base text-white"
            placeholder="Add notes"
            placeholderTextColor="#71717a"
          />

          <Text className="mt-5 text-xs uppercase tracking-wide text-zinc-500">Priority</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {TaskPriority.map((p) => (
              <Chip
                key={p}
                label={`${p} · ${priorityLabels[p]}`}
                active={task.priority === p}
                color={priorityColors[p]}
                onPress={() => {
                  void setPriority(task.priority === p ? null : p);
                }}
              />
            ))}
          </View>

          <Text className="mt-5 text-xs uppercase tracking-wide text-zinc-500">Category</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {TaskCategory.map((c) => (
              <Chip
                key={c}
                label={c}
                active={task.category === c}
                color="#3b82f6"
                onPress={() => {
                  void setCategory(task.category === c ? null : c);
                }}
              />
            ))}
          </View>

          <Text className="mt-5 text-xs uppercase tracking-wide text-zinc-500">Due date</Text>
          <View className="mt-2 flex-row items-center gap-3">
            <Pressable
              onPress={() => {
                const next = new Date();
                next.setHours(17, 0, 0, 0);
                void setDueDate(next.toISOString());
              }}
              className="rounded-lg border border-zinc-700 px-3 py-2"
            >
              <Text className="text-sm text-white">{dueDateLabel}</Text>
            </Pressable>
            {task.due_date && (
              <Pressable
                onPress={() => {
                  void setDueDate(null);
                }}
                className="rounded-lg px-2 py-2"
              >
                <Text className="text-sm text-zinc-400">Clear</Text>
              </Pressable>
            )}
          </View>

          <View className="mt-8">
            <Text className="text-xs uppercase tracking-wide text-zinc-500">Sub-tasks</Text>
            <View className="mt-2 gap-2">
              {subtasks.map((s) => {
                const done = s.status === 'done';
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      void handleToggleSubtask(s);
                    }}
                    className="flex-row items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-md border-2 ${
                        done ? 'border-green-500 bg-green-500' : 'border-zinc-600'
                      }`}
                    >
                      {done && <Text className="text-[11px] font-bold text-white">✓</Text>}
                    </View>
                    <Text
                      className={`flex-1 text-sm ${
                        done ? 'text-zinc-500 line-through' : 'text-white'
                      }`}
                    >
                      {s.title}
                    </Text>
                  </Pressable>
                );
              })}
              <View className="flex-row items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                <TextInput
                  value={newSubtask}
                  onChangeText={setNewSubtask}
                  placeholder="Add sub-task…"
                  placeholderTextColor="#71717a"
                  className="flex-1 px-2 py-1 text-sm text-white"
                  onSubmitEditing={() => {
                    void handleAddSubtask();
                  }}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={() => {
                    void handleAddSubtask();
                  }}
                  disabled={!newSubtask.trim()}
                  className={`rounded-md bg-blue-500 px-3 py-1.5 ${
                    newSubtask.trim() ? '' : 'opacity-40'
                  }`}
                >
                  <Text className="text-xs font-semibold text-white">Add</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => {
              void handleDelete();
            }}
            className="mt-10 items-center rounded-lg border border-red-600/40 py-3"
          >
            <Text className="text-sm font-semibold text-red-400">Delete task</Text>
          </Pressable>

          {saving && (
            <Text className="mt-4 text-center text-xs text-zinc-500">Saving…</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
