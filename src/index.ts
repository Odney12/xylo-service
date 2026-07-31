import { Hono } from "hono";
import type { Bindings } from "./types";
import { verifyMetaSignature } from "./middleware/security";
import { getGymByPhoneNumberId } from "./services/gyms";
import { handleIncomingMessage } from "./services/incoming";
import { authRoutes } from "./routes/auth";
import { dashboardRoutes } from "./routes/dashboard";

const app = new Hono<{ Bindings: Bindings }>();

app.route("/", authRoutes);
app.route("/", dashboardRoutes);

app.get("/", (c) => c.text("gym-leads-ai is running"));

app.get("/webhook/:gymSlug", (c) => {
  const challenge = c.req.query("hub.challenge");
  return c.text(challenge ?? "no challenge provided");
});

app.post("/webhook/:gymSlug", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("X-Hub-Signature-256");

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.text("Invalid JSON", 400);
  }

  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const phoneNumberId = value?.metadata?.phone_number_id;
  if (!phoneNumberId) return c.text("No phone_number_id in payload", 400);

  const gym = await getGymByPhoneNumberId(c.env.DB, phoneNumberId);
  if (!gym) return c.text("Unknown gym", 404);

  const validSignature = await verifyMetaSignature(rawBody, signature, gym.meta_app_secret);
  if (!validSignature) return c.text("Invalid signature", 401);

  const message = value?.messages?.[0];
  if (!message) {
    return c.text("OK", 200);
  }

  const contactName = value?.contacts?.[0]?.profile?.name ?? null;

  c.executionCtx.waitUntil(handleIncomingMessage(c.env, gym, message, contactName));

  return c.text("OK", 200);
});

app.get("/health", (_c) => new Response(JSON.stringify({ status: "ok" }), { headers: { "Content-Type": "application/json" } }));

export default app;