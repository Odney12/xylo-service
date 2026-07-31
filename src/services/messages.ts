import type { Message } from "../types";

export async function pushMessage(db: D1Database, leadId: number, role: "user" | "assistant", text: string): Promise<void> {
  await db.prepare("INSERT INTO messages (lead_id, role, text) VALUES (?, ?, ?)").bind(leadId, role, text).run();
}

/** Last N messages for a lead, oldest first - ready to feed to Gemini as conversation history. */
export async function getRecentHistory(db: D1Database, leadId: number, limit = 10): Promise<Message[]> {
  const result = await db
    .prepare("SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?")
    .bind(leadId, limit)
    .all<Message>();

  return (result.results ?? []).reverse();
}