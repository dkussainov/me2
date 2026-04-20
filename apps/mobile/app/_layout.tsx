import 'react-native-gesture-handler';
import '../global.css';

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import { openMigratedDatabase } from '@/db/migrate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await openMigratedDatabase();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setInitError(err instanceof Error ? err.message : 'db_init_failed');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        {initError ? null : <ActivityIndicator color="#3b82f6" />}
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} className="bg-zinc-950">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#09090b' },
              headerTintColor: '#ffffff',
              headerShadowVisible: false,
              contentStyle: { backgroundColor: '#09090b' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="task/[id]" options={{ title: 'Task', presentation: 'card' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
