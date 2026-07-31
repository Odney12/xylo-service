import type { Lead } from "../types";

export async function getOrCreateLead(db: D1Database, gymId: number, phone: string, name?: string | null): Promise<Lead> {
  const existing = await db
    .prepare("SELECT * FROM leads WHERE gym_id = ? AND phone = ?")
    .bind(gymId, phone)
    .first<Lead>();

  if (existing) {
    if (name && !existing.name) {
      await db.prepare("UPDATE leads SET name = ? WHERE id = ?").bind(name, existing.id).run();
      return { ...existing, name };
    }
    return existing;
  }

  const inserted = await db
    .prepare("INSERT INTO leads (gym_id, phone, name, pipeline_stage) VALUES (?, ?, ?, 'NEW') RETURNING *")
    .bind(gymId, phone, name ?? null)
    .first<Lead>();
  if (!inserted) throw new Error("Failed to create lead");
  return inserted;
}

export async function touchLead(db: D1Database, leadId: number): Promise<void> {
  await db.prepare("UPDATE leads SET last_message_at = datetime('now') WHERE id = ?").bind(leadId).run();
}

export async function applyStructuredUpdate(
  db: D1Database,
  leadId: number,
  pipelineStage: "NEW" | "PASS_CLAIMED" | "TOUR_BOOKED",
  extractedGoal: string | null
): Promise<void> {
  if (extractedGoal) {
    await db
      .prepare("UPDATE leads SET pipeline_stage = ?, extracted_goal = ? WHERE id = ? AND pipeline_stage != 'HUMAN_PAUSED'")
      .bind(pipelineStage, extractedGoal, leadId)
      .run();
  } else {
    await db
      .prepare("UPDATE leads SET pipeline_stage = ? WHERE id = ? AND pipeline_stage != 'HUMAN_PAUSED'")
      .bind(pipelineStage, leadId)
      .run();
  }
}

export async function setHumanPaused(db: D1Database, leadId: number): Promise<void> {
  await db.prepare("UPDATE leads SET pipeline_stage = 'HUMAN_PAUSED' WHERE id = ?").bind(leadId).run();
}

export async function isHumanPaused(db: D1Database, leadId: number): Promise<boolean> {
  const row = await db.prepare("SELECT pipeline_stage FROM leads WHERE id = ?").bind(leadId).first<{ pipeline_stage: string }>();
  return row?.pipeline_stage === "HUMAN_PAUSED";
}

export async function getLeadById(db: D1Database, id: number): Promise<Lead | null> {
  const result = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first<Lead>();
  return result ?? null;
}

export async function listLeadsForGym(db: D1Database, gymId: number): Promise<Lead[]> {
  const result = await db.prepare("SELECT * FROM leads WHERE gym_id = ? ORDER BY last_message_at DESC").bind(gymId).all<Lead>();
  return result.results ?? [];
}

export async function listAllLeads(db: D1Database): Promise<(Lead & { gym_name: string })[]> {
  const result = await db
    .prepare(
      `SELECT leads.*, gyms.name AS gym_name FROM leads
       JOIN gyms ON gyms.id = leads.gym_id
       ORDER BY leads.last_message_at DESC`
    )
    .all<Lead & { gym_name: string }>();
  return result.results ?? [];
}

export type StageCounts = { NEW: number; PASS_CLAIMED: number; TOUR_BOOKED: number; HUMAN_PAUSED: number };

export async function getStageCountsForGym(db: D1Database, gymId: number): Promise<StageCounts> {
  const result = await db
    .prepare("SELECT pipeline_stage, COUNT(*) as count FROM leads WHERE gym_id = ? GROUP BY pipeline_stage")
    .bind(gymId)
    .all<{ pipeline_stage: string; count: number }>();

  const counts: StageCounts = { NEW: 0, PASS_CLAIMED: 0, TOUR_BOOKED: 0, HUMAN_PAUSED: 0 };
  for (const row of result.results ?? []) {
    counts[row.pipeline_stage as keyof StageCounts] = row.count;
  }
  return counts;
}

export async function getStageCountsAllGyms(db: D1Database): Promise<(StageCounts & { gym_id: number; gym_name: string })[]> {
  const result = await db
    .prepare(
      `SELECT gyms.id as gym_id, gyms.name as gym_name, leads.pipeline_stage, COUNT(*) as count
       FROM leads JOIN gyms ON gyms.id = leads.gym_id
       GROUP BY gyms.id, leads.pipeline_stage`
    )
    .all<{ gym_id: number; gym_name: string; pipeline_stage: string; count: number }>();

  const byGym = new Map<number, StageCounts & { gym_id: number; gym_name: string }>();
  for (const row of result.results ?? []) {
    if (!byGym.has(row.gym_id)) {
      byGym.set(row.gym_id, { gym_id: row.gym_id, gym_name: row.gym_name, NEW: 0, PASS_CLAIMED: 0, TOUR_BOOKED: 0, HUMAN_PAUSED: 0 });
    }
    byGym.get(row.gym_id)![row.pipeline_stage as keyof StageCounts] = row.count;
  }
  return [...byGym.values()];
}