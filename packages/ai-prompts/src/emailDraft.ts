export function emailDraftV1(thread: string, bullets: string[]): string {
  const bulletList =
    bullets.length > 0
      ? bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')
      : '(no bullet points provided — infer a minimal acknowledgement reply)';

  return `You are drafting an email reply on behalf of the user.

Email thread (most recent message last):
"""
${thread}
"""

User's reply intent (bullet points to cover):
${bulletList}

Write a reply email body that:
- Addresses every bullet point in the user's intent, in a natural order (not as a literal numbered list).
- Matches the register and tone of the most recent message in the thread (formal, casual, or neutral).
- Is concise — no filler phrases like "I hope this email finds you well" or "Just wanted to reach out". Get to the point in the first sentence.
- Uses a greeting only if the thread is at its start or the previous messages used greetings. Otherwise dive straight in.
- Ends with "Best," on its own line, followed by "[User]" on the next line as a placeholder — do not guess the user's real name.

Hard rules:
- Do not include a subject line — this is a reply, the subject is inherited.
- Do not include "To:" or "From:" headers.
- Do not invent facts, commitments, dates, or names that are not in the thread or the user's bullets.
- Do not include commentary about the draft — output only the email body text.`;
}
