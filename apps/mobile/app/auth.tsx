import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { API_URL, setAuthToken } from '@/lib/api';

interface TokenResponse {
  token: string;
  expires_at: string;
  user: { id: string; email: string; name: string | null };
}

const GITHUB_TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=user:email&description=ME2%20Mobile%20(dev)';

async function exchangeGithubToken(githubToken: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ github_token: githubToken }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `auth_failed_${res.status}`);
  }
  return (await res.json()) as TokenResponse;
}

export default function AuthScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    const token = input.trim();
    if (token.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await exchangeGithubToken(token);
      await setAuthToken(result.token);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown_error');
    } finally {
      setSubmitting(false);
    }
  }, [input, submitting, router]);

  const openGithubTokenPage = useCallback(() => {
    void Linking.openURL(GITHUB_TOKEN_URL);
  }, []);

  const canSubmit = input.trim().length > 0 && !submitting;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1 px-6 pt-16">
            <View className="items-center">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15">
                <Text className="text-xl font-bold tracking-tight text-blue-400">M2</Text>
              </View>
              <Text className="mt-4 text-3xl font-bold text-white">Sign in to ME2</Text>
              <Text className="mt-2 text-center text-sm text-zinc-400">
                Paste a GitHub personal access token with{' '}
                <Text className="font-semibold text-zinc-300">user:email</Text> scope.
              </Text>
            </View>

            <View className="mt-10">
              <Text className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                GitHub token
              </Text>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="ghp_…"
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!submitting}
                className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-base text-white"
              />
              {error && (
                <Text role="alert" className="mt-3 text-sm text-red-400">
                  {error}
                </Text>
              )}
            </View>

            <Pressable
              onPress={() => {
                void handleSignIn();
              }}
              disabled={!canSubmit}
              className={`mt-6 items-center rounded-lg bg-blue-500 px-4 py-3.5 ${
                canSubmit ? '' : 'opacity-40'
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Sign in</Text>
              )}
            </Pressable>

            <Pressable onPress={openGithubTokenPage} className="mt-4 items-center py-2">
              <Text className="text-sm text-blue-400">Create a token on GitHub →</Text>
            </Pressable>

            <Text className="mt-auto mb-4 text-center text-[11px] text-zinc-600">
              Dev-mode auth. Apple Sign In arrives in Sprint 2.
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
