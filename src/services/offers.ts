export type Offer = {
  id: number;
  gym_id: number;
  title: string;
  description: string;
  valid_until: string | null;
  active: number;
};

export async function listOffers(db: D1Database, gymId: number): Promise<Offer[]> {
  const result = await db.prepare("SELECT * FROM offers WHERE gym_id = ? AND active = 1 ORDER BY created_at DESC").bind(gymId).all<Offer>();
  return result.results ?? [];
}

export async function createOffer(db: D1Database, gymId: number, title: string, description: string, validUntil: string | null): Promise<Offer> {
  const row = await db
    .prepare("INSERT INTO offers (gym_id, title, description, valid_until) VALUES (?, ?, ?, ?) RETURNING *")
    .bind(gymId, title, description, validUntil)
    .first<Offer>();
  if (!row) throw new Error("Failed to create offer");
  return row;
}

export async function updateOffer(db: D1Database, id: number, title: string, description: string, validUntil: string | null): Promise<void> {
  await db.prepare("UPDATE offers SET title = ?, description = ?, valid_until = ? WHERE id = ?").bind(title, description, validUntil, id).run();
}

export async function deleteOffer(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE offers SET active = 0 WHERE id = ?").bind(id).run();
}

export async function getOfferGymId(db: D1Database, id: number): Promise<number | null> {
  const row = await db.prepare("SELECT gym_id FROM offers WHERE id = ?").bind(id).first<{ gym_id: number }>();
  return row?.gym_id ?? null;
}