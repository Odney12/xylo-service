import type { Context, Next } from "hono";
import type { Bindings } from "../types";
import { getSessionUser, type SessionUser } from "../services/sessions";

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

/** Attaches the logged-in user to c.var.user, or returns 401. */
export async function requireLogin(c: Context<{ Bindings: Bindings; Variables: { user: SessionUser } }>, next: Next) {
  const sessionId = getCookie(c.req.header("Cookie"), "session");
  if (!sessionId) return c.json({ error: "Not logged in" }, 401);

  const user = await getSessionUser(c.env.DB, sessionId);
  if (!user) return c.json({ error: "Not logged in" }, 401);

  c.set("user", user);
  await next();
}

/** Call after requireLogin. Agency can access any gymId; gym_owner only their own. */
export function canAccessGym(user: SessionUser, gymId: number): boolean {
  if (user.role === "agency") return true;
  return user.gym_id === gymId;
}