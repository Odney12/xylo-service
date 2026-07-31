export type GymEvent = {
  id: number;
  gym_id: number;
  title: string;
  description: string | null;
  event_time: string;
  capacity: number | null;
  active: number;
};

export async function listEvents(db: D1Database, gymId: number): Promise<GymEvent[]> {
  const result = await db.prepare("SELECT * FROM events WHERE gym_id = ? AND active = 1 ORDER BY event_time ASC").bind(gymId).all<GymEvent>();
  return result.results ?? [];
}

export async function createEvent(db: D1Database, gymId: number, title: string, description: string | null, eventTime: string, capacity: number | null): Promise<GymEvent> {
  const row = await db
    .prepare("INSERT INTO events (gym_id, title, description, event_time, capacity) VALUES (?, ?, ?, ?, ?) RETURNING *")
    .bind(gymId, title, description, eventTime, capacity)
    .first<GymEvent>();
  if (!row) throw new Error("Failed to create event");
  return row;
}

export async function updateEvent(db: D1Database, id: number, title: string, description: string | null, eventTime: string, capacity: number | null): Promise<void> {
  await db.prepare("UPDATE events SET title = ?, description = ?, event_time = ?, capacity = ? WHERE id = ?").bind(title, description, eventTime, capacity, id).run();
}

export async function deleteEvent(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE events SET active = 0 WHERE id = ?").bind(id).run();
}

export async function getEventGymId(db: D1Database, id: number): Promise<number | null> {
  const row = await db.prepare("SELECT gym_id FROM events WHERE id = ?").bind(id).first<{ gym_id: number }>();
  return row?.gym_id ?? null;
}