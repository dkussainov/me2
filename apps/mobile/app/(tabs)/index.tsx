import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Task } from '@me2/types';
import { priorityColors, priorityLabels } from '@/constants/tokens';
import { selectVisibleTasks, useTaskStore } from '@/stores/taskStore';
import { useTasks } from '@/queries/useTasks';

const LOCAL_USER_ID = 'local-user';

function formatDueDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: priorityColors[priority] + '33' }}
    >
      <Text className="text-[11px] font-semibold" style={{ color: priorityColors[priority] }}>
        {priority} · {priorityLabels[priority]}
      </Text>
    </View>
  );
}

function CategoryChip({ category }: { category: Task['category'] }) {
  if (!category) return null;
  return (
    <View className="rounded-full bg-zinc-800 px-2 py-0.5">
      <Text className="text-[11px] text-zinc-300">{category}</Text>
    </View>
  );
}

function TaskRow({ task, onPress }: { task: Task; onPress: (t: Task) => void }) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const due = formatDueDate(task.due_date);

  const renderRightActions = useCallback(
    () => (
      <View className="flex-row">
        <Pressable
          onPress={() => {
            void updateTask(task.id, {
              status: 'done',
              completed_at: new Date().toISOString(),
            });
          }}
          className="h-full justify-center bg-green-600 px-5"
        >
          <Text className="text-sm font-semibold text-white">Done</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void removeTask(task.id);
          }}
          className="h-full justify-center bg-red-600 px-5"
        >
          <Text className="text-sm font-semibold text-white">Delete</Text>
        </Pressable>
      </View>
    ),
    [task.id, updateTask, removeTask]
  );

  const isDone = task.status === 'done';

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        onPress={() => onPress(task)}
        className="active:bg-zinc-900/60 border-b border-zinc-900 bg-zinc-950 px-4 py-3"
      >
        <View className="flex-row items-start gap-3">
          <View
            className={`mt-1 h-3 w-3 rounded-full ${
              isDone ? 'bg-green-500' : 'border-2 border-zinc-700'
            }`}
          />
          <View className="flex-1">
            <Text
              className={`text-base ${
                isDone ? 'text-zinc-500 line-through' : 'text-white'
              }`}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              <CategoryChip category={task.category} />
              {due && <Text className="text-xs text-zinc-400">{due}</Text>}
              {task.assignee_name && (
                <Text className="text-xs text-blue-400">@ {task.assignee_name}</Text>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-24">
      <Text className="text-2xl font-semibold text-white">All clear</Text>
      <Text className="mt-2 text-center text-sm text-zinc-400">
        Capture a task from the Capture tab, or via Siri, share sheet, or email.
      </Text>
    </View>
  );
}

export default function InboxScreen() {
  const router = useRouter();
  const visibleTasks = useTaskStore(selectVisibleTasks);
  const hydrateFromLocal = useTaskStore((s) => s.hydrateFromLocal);
  const syncStatus = useTaskStore((s) => s.syncStatus);
  const [refreshing, setRefreshing] = useState(false);
  const query = useTasks();

  useEffect(() => {
    void hydrateFromLocal(LOCAL_USER_ID);
  }, [hydrateFromLocal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const handlePress = useCallback(
    (task: Task) => {
      router.push(`/task/${task.id}`);
    },
    [router]
  );

  const sortedTasks = useMemo(
    () =>
      [...visibleTasks].sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (b.status === 'done' && a.status !== 'done') return -1;
        return b.updated_at.localeCompare(a.updated_at);
      }),
    [visibleTasks]
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-zinc-950">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-white">Inbox</Text>
        <Text className="text-xs text-zinc-500">
          {syncStatus === 'syncing' ? 'Syncing…' : `${sortedTasks.length} open`}
        </Text>
      </View>
      <FlatList
        data={sortedTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskRow task={item} onPress={handlePress} />}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || query.isFetching}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor="#3b82f6"
          />
        }
        contentContainerStyle={sortedTasks.length === 0 ? { flexGrow: 1 } : undefined}
      />
    </SafeAreaView>
  );
}
