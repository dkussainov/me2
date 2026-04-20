import 'react-native-gesture-handler';
import '../global.css';

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import { openMigratedDatabase } from '@/db/migrate';
import { API_URL, getAuthToken, isDev } from '@/lib/api';

console.log(`[me2/api] ${isDev() ? 'dev' : 'prod'} · API_URL = ${API_URL}`);

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

interface InitState {
  ready: boolean;
  authed: boolean;
}

function AuthGate({ authed }: { authed: boolean }) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthRoute = segments[0] === 'auth';
    if (!authed && !inAuthRoute) {
      router.replace('/auth');
    } else if (authed && inAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [authed, segments, router]);

  return null;
}

export default function RootLayout() {
  const [state, setState] = useState<InitState>({ ready: false, authed: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await openMigratedDatabase();
      } catch (err) {
        console.error('[me2/db.init]', err);
      }
      const token = await getAuthToken().catch(() => null);
      if (!cancelled) setState({ ready: true, authed: token !== null && token.length > 0 });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  if (!state.ready) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} className="bg-zinc-950">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AuthGate authed={state.authed} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#09090b' },
              headerTintColor: '#ffffff',
              headerShadowVisible: false,
              contentStyle: { backgroundColor: '#09090b' },
            }}
          >
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="task/[id]" options={{ title: 'Task', presentation: 'card' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
