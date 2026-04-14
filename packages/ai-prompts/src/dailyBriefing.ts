export function dailyBriefingV1(tasks: string, calendar: string): string {
  const now = new Date().toISOString();

  return `You are generating a morning briefing for the user. Keep it short, warm, and actionable — this is read on a phone lock screen or in a menu bar popover.

Current time (UTC): ${now}

Today's tasks (JSON array):
"""
${tasks}
"""

Today's calendar events (JSON array):
"""
${calendar}
"""

Write the briefing as plain text in this exact structure:

1. Opener (one sentence): state the shape of the day. Example: "You've got 4 tasks and 3 meetings today, with one tight window after lunch."
2. Top priorities (up to 3 numbered lines): the most important items from tasks + calendar combined. P1 tasks and time-sensitive events first. For each line: one sentence with what it is, when it is, and why it matters today.
3. Watch out (one sentence, optional): flag any conflict, overdue task, back-to-back meeting stack, or blocker. Skip this section entirely if there is nothing genuinely worth flagging.
4. Close (one short sentence): a brief encouraging sign-off. Vary the wording day to day.

Hard rules:
- Never invent tasks or events that are not in the input.
- Never include more than 3 top priorities.
- Never use markdown headers, bullet characters, or emoji — plain text only. Numbered lines for priorities are fine.
- Keep the entire briefing under 120 words.
- If both inputs are empty arrays, return a single sentence acknowledging an open day and nothing else.`;
}
