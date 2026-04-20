# ME2 Tasks

Send selected code — or the current line — straight to your ME2 inbox from **VS Code**, **Cursor**, or **Windsurf**. The extension detects which editor it's running in and tags the task with the right source.

## Install

### From a `.vsix`

```bash
pnpm install
pnpm --filter me2-tasks build
pnpm --filter me2-tasks package
code --install-extension me2-tasks-0.1.0.vsix   # or cursor / windsurf
```

### From the Marketplace

Not yet published.

## Set your API token

The token is stored in the OS keychain via VS Code's `SecretStorage` API. It is **never** written to `settings.json` or any file that could be committed.

1. Open the command palette: `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Win/Linux)
2. Run **ME2: Set API Token**
3. Paste the token issued for your account

To remove it, run **ME2: Clear API Token**.

## Usage

1. Select code in the editor (or just place the cursor on a line).
2. Press `Cmd+Shift+T` (macOS) / `Ctrl+Shift+T` (Win/Linux), **or** run **ME2: Send to Inbox** from the command palette.
3. The extension sends the task with:
   - `title` — first line of the selection (or `file:line` if nothing is selected)
   - `source` — `vscode`, `cursor`, or `windsurf` (auto-detected from `vscode.env.appName`)
   - `context.file` — path relative to the workspace root
   - `context.line` — 1-indexed line number
   - `context.repo` — workspace folder name
   - `context.branch` — current git branch (read from `.git/HEAD`)
   - `context.snippet` — selection text, truncated to 2000 chars

> Note: `Cmd/Ctrl+Shift+T` conflicts with VS Code's built-in "Reopen Closed Editor". Remap via **Preferences → Keyboard Shortcuts** if you prefer.

## Configuration

| Setting       | Default                     | Description                                     |
| ------------- | --------------------------- | ----------------------------------------------- |
| `me2.apiUrl`  | `https://me2.vercel.app`    | Base URL for the ME2 API (override for self-host) |

## Development

```bash
pnpm install
pnpm --filter me2-tasks watch   # esbuild watch → dist/extension.js
```

Press `F5` from within VS Code to launch the Extension Development Host.

## Security

- API token lives in `context.secrets` (OS keychain) only.
- Requests go out as `Authorization: Bearer <token>` over HTTPS.
- Snippet payloads are capped at 2000 characters before leaving the machine.
