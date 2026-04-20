'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CreateTaskInput, Task } from '@me2/types';

type BridgeWindow = Window & {
  webkit?: {
    messageHandlers?: {
      taskSaved?: { postMessage: (payload: unknown) => void };
    };
  };
  padaBridge?: {
    onShortcutTriggered: () => void;
  };
};

function generateUuid(): string {
  return crypto.randomUUID();
}

export default function PopoverPage() {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bridgeWindow = window as BridgeWindow;
    bridgeWindow.padaBridge = {
      onShortcutTriggered: () => inputRef.current?.focus(),
    };
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = title.trim();
      if (!trimmed || submitting) return;

      setSubmitting(true);
      setError(null);

      const payload: CreateTaskInput = {
        id: generateUuid(),
        title: trimmed,
        status: 'open',
        source: 'manual',
      };

      try {
        const res = await fetch('/api/v1/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `request_failed_${res.status}`);
        }

        const saved = (await res.json()) as Task;
        setTitle('');

        const bridgeWindow = window as BridgeWindow;
        bridgeWindow.webkit?.messageHandlers?.taskSaved?.postMessage({ id: saved.id });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'unknown_error');
      } finally {
        setSubmitting(false);
      }
    },
    [title, submitting]
  );

  return (
    <main className="flex min-h-screen items-start justify-center bg-zinc-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3">
        <label htmlFor="task-title" className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
          Quick add
        </label>
        <input
          ref={inputRef}
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Capture a task…"
          maxLength={500}
          disabled={submitting}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
          autoComplete="off"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-500">⏎ to save</span>
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
