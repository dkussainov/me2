import { TaskPriority, TaskCategory } from '@me2/types';

const PRIORITY_LIST = TaskPriority.join('", "');
const CATEGORY_LIST = TaskCategory.join('", "');

export function taskParseV2(input: string): string {
  const now = new Date().toISOString();

  return `You extract structured task data from natural language input for a personal task manager.

Current time (UTC): ${now}

User input (verbatim, may include transcription errors):
"""
${input}
"""

Return a single JSON object that matches this schema:
- title (string, 1–500 chars): a concise action-oriented task title with no filler. Prefer imperative voice. Example: input "I need to call John tomorrow about the contract" → title "Call John about the contract".
- due_date (ISO 8601 UTC string or null): resolve relative expressions like "tomorrow", "next Friday", "in 2 hours", "EOD" against the current time above. Default to 09:00 local if only a date is given, to 17:00 for "EOD". Return null if no time signal is present.
- priority (one of "${PRIORITY_LIST}", or null):
  - P1 = urgent and important (today, blocker, "ASAP", "critical")
  - P2 = important this week, deadline within a few days
  - P3 = normal default for most tasks
  - P4 = someday / nice to have / "when you have time"
  Return null only if the input gives zero signal about priority.
- category (one of "${CATEGORY_LIST}", or null): pick the single best fit based on the noun and context. Return null only if genuinely ambiguous.
- assignees (array of strings): names of other people mentioned as the doer of the task (delegation). Empty array if the user is the doer. Do not include people who are only mentioned as context (e.g. "about John" is not an assignee).
- confidence (number 0.0–1.0): your honest confidence that the extraction matches the user's intent. Use < 0.7 for ambiguous, short, or garbled input so the user is prompted to confirm.

Hard rules:
- Never invent dates, people, priorities, or categories that are not supported by the input.
- Never return markdown, commentary, or code fences — output a single JSON object and nothing else.
- If the input is empty or meaningless, set confidence to 0.1, use the raw input as the title, and set every optional field to null or an empty array.`;
}
