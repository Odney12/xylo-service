export type PricingPlan = {
  id: number;
  gym_id: number;
  name: string;
  price: string;
  billing_period: string;
  includes: string | null;
  active: number;
};

export async function listPricingPlans(db: D1Database, gymId: number): Promise<PricingPlan[]> {
  const result = await db.prepare("SELECT * FROM pricing_plans WHERE gym_id = ? AND active = 1 ORDER BY created_at DESC").bind(gymId).all<PricingPlan>();
  return result.results ?? [];
}

export async function createPricingPlan(db: D1Database, gymId: number, name: string, price: string, billingPeriod: string, includes: string | null): Promise<PricingPlan> {
  const row = await db
    .prepare("INSERT INTO pricing_plans (gym_id, name, price, billing_period, includes) VALUES (?, ?, ?, ?, ?) RETURNING *")
    .bind(gymId, name, price, billingPeriod, includes)
    .first<PricingPlan>();
  if (!row) throw new Error("Failed to create pricing plan");
  return row;
}

export async function updatePricingPlan(db: D1Database, id: number, name: string, price: string, billingPeriod: string, includes: string | null): Promise<void> {
  await db.prepare("UPDATE pricing_plans SET name = ?, price = ?, billing_period = ?, includes = ? WHERE id = ?").bind(name, price, billingPeriod, includes, id).run();
}

export async function deletePricingPlan(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE pricing_plans SET active = 0 WHERE id = ?").bind(id).run();
}

export async function getPricingPlanGymId(db: D1Database, id: number): Promise<number | null> {
  const row = await db.prepare("SELECT gym_id FROM pricing_plans WHERE id = ?").bind(id).first<{ gym_id: number }>();
  return row?.gym_id ?? null;
}