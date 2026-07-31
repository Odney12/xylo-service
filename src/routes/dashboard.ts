import { Hono } from "hono";
import type { Bindings } from "../types";
import type { SessionUser } from "../services/sessions";
import { requireLogin, canAccessGym } from "../middleware/requireAuth";
import { listOffers, createOffer, updateOffer, deleteOffer, getOfferGymId } from "../services/offers";
import { listPricingPlans, createPricingPlan, updatePricingPlan, deletePricingPlan, getPricingPlanGymId } from "../services/pricing";
import { listEvents, createEvent, updateEvent, deleteEvent, getEventGymId } from "../services/events";
import {
  listLeadsForGym,
  listAllLeads,
  getLeadById,
  getStageCountsForGym,
  getStageCountsAllGyms,
  applyStructuredUpdate,
  setHumanPaused,
} from "../services/leads";
import { pushMessage, getRecentHistory } from "../services/messages";
import { listGyms, getGymById } from "../services/gyms";
import { sendWhatsAppMessage } from "../services/whatsapp";
import { handleIncomingMessage } from "../services/incoming";

type Vars = { user: SessionUser };
export const dashboardRoutes = new Hono<{ Bindings: Bindings; Variables: Vars }>();

dashboardRoutes.use("/api/*", requireLogin);

// ---------- Gyms ----------

dashboardRoutes.get("/api/gyms", async (c) => {
  const user = c.get("user");
  if (user.role !== "agency") return c.json({ error: "Forbidden" }, 403);
  const gyms = await listGyms(c.env.DB);
  return c.json(gyms);
});

dashboardRoutes.get("/api/gyms/:gymId", async (c) => {
  const user = c.get("user");
  const gymId = Number(c.req.param("gymId"));
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  const gym = await getGymById(c.env.DB, gymId);
  if (!gym) return c.json({ error: "Not found" }, 404);
  return c.json(gym);
});

// ---------- Leads ----------

dashboardRoutes.get("/api/leads", async (c) => {
  const user = c.get("user");
  const gymIdParam = c.req.query("gym_id");

  if (user.role === "agency") {
    const leads = gymIdParam ? await listLeadsForGym(c.env.DB, Number(gymIdParam)) : await listAllLeads(c.env.DB);
    return c.json(leads);
  }

  if (!user.gym_id) return c.json({ error: "No gym assigned" }, 403);
  const leads = await listLeadsForGym(c.env.DB, user.gym_id);
  return c.json(leads);
});

dashboardRoutes.get("/api/leads/:id", async (c) => {
  const user = c.get("user");
  const lead = await getLeadById(c.env.DB, Number(c.req.param("id")));
  if (!lead) return c.json({ error: "Not found" }, 404);
  if (!canAccessGym(user, lead.gym_id)) return c.json({ error: "Forbidden" }, 403);

  const history = await getRecentHistory(c.env.DB, lead.id, 50);
  return c.json({ lead, messages: history });
});

dashboardRoutes.put("/api/leads/:id/stage", async (c) => {
  const user = c.get("user");
  const lead = await getLeadById(c.env.DB, Number(c.req.param("id")));
  if (!lead) return c.json({ error: "Not found" }, 404);
  if (!canAccessGym(user, lead.gym_id)) return c.json({ error: "Forbidden" }, 403);

  const { pipeline_stage } = await c.req.json();
  if (pipeline_stage === "HUMAN_PAUSED") {
    await setHumanPaused(c.env.DB, lead.id);
  } else {
    await applyStructuredUpdate(c.env.DB, lead.id, pipeline_stage, lead.extracted_goal);
  }
  return c.json({ success: true });
});

dashboardRoutes.post("/api/leads/:id/resume-bot", async (c) => {
  const user = c.get("user");
  const lead = await getLeadById(c.env.DB, Number(c.req.param("id")));
  if (!lead) return c.json({ error: "Not found" }, 404);
  if (!canAccessGym(user, lead.gym_id)) return c.json({ error: "Forbidden" }, 403);

  await applyStructuredUpdate(c.env.DB, lead.id, "NEW", lead.extracted_goal);
  return c.json({ success: true });
});

// Manual message send - a human at the front desk typing directly to the lead.
dashboardRoutes.post("/api/leads/:id/send", async (c) => {
  const user = c.get("user");
  const lead = await getLeadById(c.env.DB, Number(c.req.param("id")));
  if (!lead) return c.json({ error: "Not found" }, 404);
  if (!canAccessGym(user, lead.gym_id)) return c.json({ error: "Forbidden" }, 403);

  const gym = await getGymById(c.env.DB, lead.gym_id);
  if (!gym) return c.json({ error: "Gym not found" }, 404);

  const { text } = await c.req.json();
  if (!text || typeof text !== "string") return c.json({ error: "text is required" }, 400);

  await pushMessage(c.env.DB, lead.id, "assistant", text);
  await sendWhatsAppMessage(gym, lead.phone, text);

  return c.json({ success: true });
});

// Dev-only: fire a synthetic inbound message through the REAL pipeline
// (Gemini + D1, same as an actual WhatsApp message) without needing Meta.
dashboardRoutes.post("/api/dev/simulate-webhook", async (c) => {
  const user = c.get("user");
  const { gym_id, phone, name, text } = await c.req.json();

  const gymId = Number(gym_id);
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);

  const gym = await getGymById(c.env.DB, gymId);
  if (!gym) return c.json({ error: "Gym not found" }, 404);

  const fakeMessage = { from: phone, type: "text", text: { body: text } };
  await handleIncomingMessage(c.env, gym, fakeMessage, name ?? null);

  return c.json({ success: true });
});

dashboardRoutes.get("/api/stats", async (c) => {
  const user = c.get("user");

  if (user.role === "agency") {
    const gymIdParam = c.req.query("gym_id");
    if (gymIdParam) {
      return c.json(await getStageCountsForGym(c.env.DB, Number(gymIdParam)));
    }
    return c.json(await getStageCountsAllGyms(c.env.DB));
  }

  if (!user.gym_id) return c.json({ error: "No gym assigned" }, 403);
  return c.json(await getStageCountsForGym(c.env.DB, user.gym_id));
});

// ---------- Offers ----------

dashboardRoutes.get("/api/gyms/:gymId/offers", async (c) => {
  const user = c.get("user");
  const gymId = Number(c.req.param("gymId"));
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  return c.json(await listOffers(c.env.DB, gymId));
});

dashboardRoutes.post("/api/gyms/:gymId/offers", async (c) => {
  const user = c.get("user");
  const gymId = Number(c.req.param("gymId"));
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  const { title, description, valid_until } = await c.req.json();
  const offer = await createOffer(c.env.DB, gymId, title, description, valid_until ?? null);
  return c.json(offer);
});

dashboardRoutes.put("/api/offers/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const gymId = await getOfferGymId(c.env.DB, id);
  if (gymId === null || !canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  const { title, description, valid_until } = await c.req.json();
  await updateOffer(c.env.DB, id, title, description, valid_until ?? null);
  return c.json({ success: true });
});

dashboardRoutes.delete("/api/offers/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const gymId = await getOfferGymId(c.env.DB, id);
  if (gymId === null || !canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  await deleteOffer(c.env.DB, id);
  return c.json({ success: true });
});

// ---------- Pricing plans ----------

dashboardRoutes.get("/api/gyms/:gymId/pricing", async (c) => {
  const user = c.get("user");
  const gymId = Number(c.req.param("gymId"));
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  return c.json(await listPricingPlans(c.env.DB, gymId));
});

dashboardRoutes.post("/api/gyms/:gymId/pricing", async (c) => {
  const user = c.get("user");
  const gymId = Number(c.req.param("gymId"));
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  const { name, price, billing_period, includes } = await c.req.json();
  const plan = await createPricingPlan(c.env.DB, gymId, name, price, billing_period ?? "monthly", includes ?? null);
  return c.json(plan);
});

dashboardRoutes.put("/api/pricing/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const gymId = await getPricingPlanGymId(c.env.DB, id);
  if (gymId === null || !canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  const { name, price, billing_period, includes } = await c.req.json();
  await updatePricingPlan(c.env.DB, id, name, price, billing_period, includes ?? null);
  return c.json({ success: true });
});

dashboardRoutes.delete("/api/pricing/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const gymId = await getPricingPlanGymId(c.env.DB, id);
  if (gymId === null || !canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  await deletePricingPlan(c.env.DB, id);
  return c.json({ success: true });
});

// ---------- Events ----------

dashboardRoutes.get("/api/gyms/:gymId/events", async (c) => {
  const user = c.get("user");
  const gymId = Number(c.req.param("gymId"));
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  return c.json(await listEvents(c.env.DB, gymId));
});

dashboardRoutes.post("/api/gyms/:gymId/events", async (c) => {
  const user = c.get("user");
  const gymId = Number(c.req.param("gymId"));
  if (!canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  const { title, description, event_time, capacity } = await c.req.json();
  const event = await createEvent(c.env.DB, gymId, title, description ?? null, event_time, capacity ?? null);
  return c.json(event);
});

dashboardRoutes.put("/api/events/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const gymId = await getEventGymId(c.env.DB, id);
  if (gymId === null || !canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  const { title, description, event_time, capacity } = await c.req.json();
  await updateEvent(c.env.DB, id, title, description ?? null, event_time, capacity ?? null);
  return c.json({ success: true });
});

dashboardRoutes.delete("/api/events/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const gymId = await getEventGymId(c.env.DB, id);
  if (gymId === null || !canAccessGym(user, gymId)) return c.json({ error: "Forbidden" }, 403);
  await deleteEvent(c.env.DB, id);
  return c.json({ success: true });
});

export default dashboardRoutes;