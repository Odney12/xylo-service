import type { Gym } from "../types";

export async function getGymByPhoneNumberId(
  db: D1Database,
  phoneNumberId: string
): Promise<Gym | null> {
  const result = await db
    .prepare("SELECT * FROM gyms WHERE phone_number_id = ? AND active = 1")
    .bind(phoneNumberId)
    .first<Gym>();

  return result ?? null;
}

export async function getGymById(db: D1Database, id: number): Promise<Gym | null> {
  const result = await db.prepare("SELECT * FROM gyms WHERE id = ?").bind(id).first<Gym>();
  return result ?? null;
}

export async function listGyms(db: D1Database): Promise<Gym[]> {
  const result = await db.prepare("SELECT * FROM gyms ORDER BY created_at DESC").all<Gym>();
  return result.results ?? [];
}